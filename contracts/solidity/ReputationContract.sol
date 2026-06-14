// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationContract
 * @notice Tracks reputation scores for contributors, clients, and AI agents.
 *         Scores are stored as fixed-point integers (scaled by 100).
 *         e.g. 4.8 is stored as 480.
 */
contract ReputationContract {

    enum Role { CONTRIBUTOR, CLIENT, AGENT }

    struct ReputationRecord {
        address  subject;
        Role     role;
        int256   score;          // scaled x100 (e.g. 480 = 4.80)
        uint256  totalUpdates;
        uint256  lastUpdated;
        bool     exists;
    }

    struct ReputationUpdate {
        uint256  projectId;
        int256   delta;          // scaled x100
        string   reason;
        uint256  timestamp;
        address  updatedBy;
    }

    // subject => ReputationRecord
    mapping(address => ReputationRecord) private records;

    // subject => list of updates
    mapping(address => ReputationUpdate[]) private history;

    address[] private subjectList;
    address   public owner;

    // Starting score: 3.00 = 300
    int256 constant STARTING_SCORE  = 300;
    int256 constant MAX_SCORE       = 500;  // 5.00
    int256 constant MIN_SCORE       = 0;
    int256 constant MAX_DELTA       = 100;  // +1.00 per update
    int256 constant MIN_DELTA       = -100; // -1.00 per update

    event ReputationInitialized(address indexed subject, Role role, int256 startingScore);
    event ReputationUpdated(address indexed subject, Role role, int256 delta, int256 newScore, uint256 projectId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register a new subject with a starting score of 3.00.
     */
    function initialize(address subject, Role role) external onlyOwner {
        require(!records[subject].exists, "Already initialized");
        records[subject] = ReputationRecord({
            subject:      subject,
            role:         role,
            score:        STARTING_SCORE,
            totalUpdates: 0,
            lastUpdated:  block.timestamp,
            exists:       true
        });
        subjectList.push(subject);
        emit ReputationInitialized(subject, role, STARTING_SCORE);
    }

    /**
     * @notice Update reputation score after a project event.
     * @param subject     Wallet address or agent ID hash (cast to address for agents)
     * @param delta       Change in score, scaled x100. Range: -100 to +100.
     * @param projectId   Associated project ID
     * @param reason      Human-readable reason from the agent
     */
    function update(
        address subject,
        int256  delta,
        uint256 projectId,
        string  calldata reason
    ) external onlyOwner {
        require(records[subject].exists, "Subject not initialized");
        require(delta >= MIN_DELTA && delta <= MAX_DELTA, "Delta out of range");

        ReputationRecord storage r = records[subject];
        int256 newScore = r.score + delta;

        // Clamp to [0, 500]
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        if (newScore < MIN_SCORE) newScore = MIN_SCORE;

        r.score        = newScore;
        r.totalUpdates += 1;
        r.lastUpdated  = block.timestamp;

        history[subject].push(ReputationUpdate({
            projectId: projectId,
            delta:     delta,
            reason:    reason,
            timestamp: block.timestamp,
            updatedBy: msg.sender
        }));

        emit ReputationUpdated(subject, r.role, delta, newScore, projectId);
    }

    function getScore(address subject) external view returns (int256) {
        require(records[subject].exists, "Not registered");
        return records[subject].score;
    }

    function getRecord(address subject) external view returns (ReputationRecord memory) {
        require(records[subject].exists, "Not registered");
        return records[subject];
    }

    function getHistory(address subject) external view returns (ReputationUpdate[] memory) {
        return history[subject];
    }

    function isRegistered(address subject) external view returns (bool) {
        return records[subject].exists;
    }

    // Returns score as a display string e.g. "4.80"
    function getDisplayScore(address subject) external view returns (string memory) {
        int256 s = records[subject].score;
        uint256 whole    = uint256(s) / 100;
        uint256 decimal  = uint256(s) % 100;
        return string(abi.encodePacked(
            _toString(whole), ".",
            decimal < 10 ? "0" : "",
            _toString(decimal)
        ));
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) { digits--; buf[digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }
}
