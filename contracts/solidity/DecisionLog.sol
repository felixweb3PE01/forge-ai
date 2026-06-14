// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DecisionLog
 * @notice Records every Forge AI agent decision on-chain for full auditability.
 *         Every evaluation, negotiation, verification, and reputation update gets a
 *         permanent, tamper-proof entry here.
 */
contract DecisionLog {

    enum ActionType {
        EVALUATE,
        NEGOTIATE,
        VERIFY_MILESTONE,
        UPDATE_REPUTATION,
        ORCHESTRATE
    }

    struct Decision {
        uint256   id;
        string    agentId;
        uint256   projectId;
        ActionType action;
        bytes32   dataHash;      // keccak256 of the full decision payload
        uint8     matchScore;    // 0-100, 0 if not applicable
        uint256   timestamp;
        address   recorder;
    }

    uint256 private nextId = 1;

    // decision id => Decision
    mapping(uint256 => Decision) private decisions;

    // projectId => decision ids
    mapping(uint256 => uint256[]) private projectDecisions;

    // agentId (string hash) => decision ids
    mapping(bytes32 => uint256[]) private agentDecisions;

    event DecisionRecorded(
        uint256 indexed id,
        string  agentId,
        uint256 indexed projectId,
        ActionType action,
        bytes32 dataHash,
        uint8   matchScore,
        uint256 timestamp
    );

    function record(
        string    calldata agentId,
        uint256   projectId,
        ActionType action,
        bytes32   dataHash,
        uint8     matchScore
    ) external returns (uint256 decisionId) {
        require(bytes(agentId).length > 0, "Agent ID required");
        require(matchScore <= 100, "Score must be 0-100");

        decisionId = nextId++;

        decisions[decisionId] = Decision({
            id:         decisionId,
            agentId:    agentId,
            projectId:  projectId,
            action:     action,
            dataHash:   dataHash,
            matchScore: matchScore,
            timestamp:  block.timestamp,
            recorder:   msg.sender
        });

        projectDecisions[projectId].push(decisionId);
        agentDecisions[keccak256(bytes(agentId))].push(decisionId);

        emit DecisionRecorded(decisionId, agentId, projectId, action, dataHash, matchScore, block.timestamp);
    }

    function getDecision(uint256 id) external view returns (Decision memory) {
        require(decisions[id].id != 0, "Decision not found");
        return decisions[id];
    }

    function getProjectDecisions(uint256 projectId) external view returns (uint256[] memory) {
        return projectDecisions[projectId];
    }

    function getAgentDecisions(string calldata agentId) external view returns (uint256[] memory) {
        return agentDecisions[keccak256(bytes(agentId))];
    }

    function totalDecisions() external view returns (uint256) {
        return nextId - 1;
    }
}
