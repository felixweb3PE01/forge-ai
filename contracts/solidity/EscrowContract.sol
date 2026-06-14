// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowContract
 * @notice Holds client funds per project milestone.
 *         The Forge AI Verifier agent (via the platform) approves milestones and releases payments.
 *         Clients can raise disputes; owner (platform) resolves them.
 */
contract EscrowContract {

    enum EscrowStatus { ACTIVE, COMPLETED, DISPUTED, REFUNDED }
    enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, REJECTED }

    struct Milestone {
        string         title;
        uint256        payment;      // in wei
        MilestoneStatus status;
        uint256        submittedAt;
        uint256        approvedAt;
    }

    struct Escrow {
        uint256       id;
        address       client;
        address       contributor;
        uint256       totalAmount;
        uint256       releasedAmount;
        EscrowStatus  status;
        uint256       createdAt;
        Milestone[]   milestones;
    }

    uint256 private nextId = 1;
    mapping(uint256 => Escrow) private escrows;
    address public owner;
    uint256 public platformFeeBps = 250; // 2.5%

    event EscrowCreated(uint256 indexed id, address client, address contributor, uint256 amount);
    event MilestoneSubmitted(uint256 indexed escrowId, uint256 milestoneIndex, uint256 timestamp);
    event MilestoneApproved(uint256 indexed escrowId, uint256 milestoneIndex, uint256 payment);
    event MilestoneRejected(uint256 indexed escrowId, uint256 milestoneIndex);
    event DisputeRaised(uint256 indexed escrowId, address raisedBy);
    event DisputeResolved(uint256 indexed escrowId, address resolvedBy, bool refundedToClient);
    event EscrowCompleted(uint256 indexed escrowId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyClient(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].client, "Not client");
        _;
    }

    modifier onlyContributor(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].contributor, "Not contributor");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrows[escrowId].id != 0, "Escrow not found");
        _;
    }

    modifier escrowActive(uint256 escrowId) {
        require(escrows[escrowId].status == EscrowStatus.ACTIVE, "Escrow not active");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Client creates escrow and deposits full project amount.
     * @param contributor   Contributor wallet address
     * @param milestoneTitles   Array of milestone names
     * @param milestonePayments Array of payments per milestone (must sum to msg.value minus fee)
     */
    function createEscrow(
        address contributor,
        string[] calldata milestoneTitles,
        uint256[] calldata milestonePayments
    ) external payable returns (uint256 escrowId) {
        require(contributor != address(0) && contributor != msg.sender, "Invalid contributor");
        require(milestoneTitles.length > 0, "Need at least one milestone");
        require(milestoneTitles.length == milestonePayments.length, "Titles/payments length mismatch");
        require(msg.value > 0, "Must deposit funds");

        // Verify payments sum equals deposit
        uint256 total = 0;
        for (uint256 i = 0; i < milestonePayments.length; i++) {
            require(milestonePayments[i] > 0, "Each milestone needs a payment");
            total += milestonePayments[i];
        }
        require(total == msg.value, "Payments must equal deposit");

        escrowId = nextId++;
        Escrow storage e = escrows[escrowId];
        e.id            = escrowId;
        e.client        = msg.sender;
        e.contributor   = contributor;
        e.totalAmount   = msg.value;
        e.releasedAmount = 0;
        e.status        = EscrowStatus.ACTIVE;
        e.createdAt     = block.timestamp;

        for (uint256 i = 0; i < milestoneTitles.length; i++) {
            e.milestones.push(Milestone({
                title:       milestoneTitles[i],
                payment:     milestonePayments[i],
                status:      MilestoneStatus.PENDING,
                submittedAt: 0,
                approvedAt:  0
            }));
        }

        emit EscrowCreated(escrowId, msg.sender, contributor, msg.value);
    }

    /**
     * @notice Contributor submits a milestone for review.
     */
    function submitMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        escrowActive(escrowId)
        onlyContributor(escrowId)
    {
        Milestone storage m = escrows[escrowId].milestones[milestoneIndex];
        require(m.status == MilestoneStatus.PENDING || m.status == MilestoneStatus.REJECTED, "Cannot submit");
        m.status      = MilestoneStatus.SUBMITTED;
        m.submittedAt = block.timestamp;
        emit MilestoneSubmitted(escrowId, milestoneIndex, block.timestamp);
    }

    /**
     * @notice Client approves a milestone — payment released to contributor automatically.
     *         Platform takes fee.
     */
    function approveMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        escrowActive(escrowId)
        onlyClient(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        Milestone storage m = e.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.SUBMITTED, "Milestone not submitted");

        m.status     = MilestoneStatus.APPROVED;
        m.approvedAt = block.timestamp;

        uint256 fee     = (m.payment * platformFeeBps) / 10000;
        uint256 payout  = m.payment - fee;

        e.releasedAmount += m.payment;

        // Pay contributor
        (bool sent, ) = payable(e.contributor).call{value: payout}("");
        require(sent, "Contributor payment failed");

        // Pay platform fee
        if (fee > 0) {
            (bool feeSent, ) = payable(owner).call{value: fee}("");
            require(feeSent, "Fee payment failed");
        }

        emit MilestoneApproved(escrowId, milestoneIndex, payout);

        // Auto-complete if all milestones approved
        bool allDone = true;
        for (uint256 i = 0; i < e.milestones.length; i++) {
            if (e.milestones[i].status != MilestoneStatus.APPROVED) {
                allDone = false;
                break;
            }
        }
        if (allDone) {
            e.status = EscrowStatus.COMPLETED;
            emit EscrowCompleted(escrowId);
        }
    }

    /**
     * @notice Client rejects a milestone — contributor can resubmit.
     */
    function rejectMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        escrowActive(escrowId)
        onlyClient(escrowId)
    {
        Milestone storage m = escrows[escrowId].milestones[milestoneIndex];
        require(m.status == MilestoneStatus.SUBMITTED, "Milestone not submitted");
        m.status = MilestoneStatus.REJECTED;
        emit MilestoneRejected(escrowId, milestoneIndex);
    }

    /**
     * @notice Either party can raise a dispute.
     */
    function raiseDispute(uint256 escrowId)
        external
        escrowExists(escrowId)
        escrowActive(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(msg.sender == e.client || msg.sender == e.contributor, "Not a party");
        e.status = EscrowStatus.DISPUTED;
        emit DisputeRaised(escrowId, msg.sender);
    }

    /**
     * @notice Platform owner resolves a dispute.
     * @param refundClient If true, remaining funds go back to client. If false, released to contributor.
     */
    function resolveDispute(uint256 escrowId, bool refundClient)
        external
        onlyOwner
        escrowExists(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.DISPUTED, "Not in dispute");

        uint256 remaining = e.totalAmount - e.releasedAmount;
        e.status = refundClient ? EscrowStatus.REFUNDED : EscrowStatus.COMPLETED;

        if (remaining > 0) {
            address recipient = refundClient ? e.client : e.contributor;
            (bool sent, ) = payable(recipient).call{value: remaining}("");
            require(sent, "Resolution payment failed");
        }

        emit DisputeResolved(escrowId, msg.sender, refundClient);
    }

    function getEscrow(uint256 escrowId) external view escrowExists(escrowId) returns (
        uint256 id,
        address client,
        address contributor,
        uint256 totalAmount,
        uint256 releasedAmount,
        EscrowStatus status,
        uint256 createdAt,
        uint256 milestoneCount
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.id, e.client, e.contributor, e.totalAmount, e.releasedAmount, e.status, e.createdAt, e.milestones.length);
    }

    function getMilestone(uint256 escrowId, uint256 index) external view escrowExists(escrowId) returns (Milestone memory) {
        return escrows[escrowId].milestones[index];
    }

    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "Fee too high"); // max 10%
        platformFeeBps = feeBps;
    }
}
