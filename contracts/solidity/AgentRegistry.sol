// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice Tracks Forge AI agent identities, recommendation history, success metrics,
 *         and reputation. Agents are first-class economic participants on Mantle.
 */
contract AgentRegistry {

    enum ActionType { EVALUATE, NEGOTIATE, VERIFY, REPUTATION, ORCHESTRATE }
    enum Outcome    { SUCCESS, FAILURE, PENDING }

    struct AgentAction {
        ActionType actionType;
        uint256    projectId;
        Outcome    outcome;
        uint256    timestamp;
    }

    struct Agent {
        string   agentId;        // e.g. "FORGE-AGENT-001"
        address  agentWallet;
        string   tier;           // TIER_1, TIER_2, TIER_3
        uint256  matchesMade;
        uint256  successfulProjects;
        uint256  totalActions;
        uint256  registeredAt;
        bool     active;
        bool     exists;
    }

    // agentId hash => Agent
    mapping(bytes32 => Agent) private agents;

    // agentId hash => action list
    mapping(bytes32 => AgentAction[]) private agentActions;

    bytes32[] private agentList;
    address   public owner;

    event AgentRegistered(string agentId, address agentWallet, string tier, uint256 timestamp);
    event AgentActionRecorded(string agentId, ActionType actionType, uint256 projectId, Outcome outcome);
    event AgentMatchRecorded(string agentId, uint256 projectId, bool successful);
    event AgentDeactivated(string agentId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier agentExists(string calldata agentId) {
        require(agents[_key(agentId)].exists, "Agent not found");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function _key(string memory agentId) internal pure returns (bytes32) {
        return keccak256(bytes(agentId));
    }

    function registerAgent(
        string  calldata agentId,
        address agentWallet,
        string  calldata tier
    ) external onlyOwner {
        bytes32 key = _key(agentId);
        require(!agents[key].exists, "Agent already registered");
        require(agentWallet != address(0), "Invalid wallet");

        agents[key] = Agent({
            agentId:            agentId,
            agentWallet:        agentWallet,
            tier:               tier,
            matchesMade:        0,
            successfulProjects: 0,
            totalActions:       0,
            registeredAt:       block.timestamp,
            active:             true,
            exists:             true
        });

        agentList.push(key);
        emit AgentRegistered(agentId, agentWallet, tier, block.timestamp);
    }

    /**
     * @notice Record any agent action (evaluate, negotiate, verify, etc.)
     */
    function recordAction(
        string     calldata agentId,
        ActionType actionType,
        uint256    projectId,
        Outcome    outcome
    ) external onlyOwner agentExists(agentId) {
        bytes32 key = _key(agentId);
        agents[key].totalActions++;

        agentActions[key].push(AgentAction({
            actionType: actionType,
            projectId:  projectId,
            outcome:    outcome,
            timestamp:  block.timestamp
        }));

        emit AgentActionRecorded(agentId, actionType, projectId, outcome);
    }

    /**
     * @notice Record a match outcome. Call this when a project completes.
     */
    function recordMatch(
        string  calldata agentId,
        uint256 projectId,
        bool    successful
    ) external onlyOwner agentExists(agentId) {
        bytes32 key = _key(agentId);
        agents[key].matchesMade++;
        if (successful) agents[key].successfulProjects++;
        emit AgentMatchRecorded(agentId, projectId, successful);
    }

    function deactivate(string calldata agentId) external onlyOwner agentExists(agentId) {
        agents[_key(agentId)].active = false;
        emit AgentDeactivated(agentId);
    }

    function getAgent(string calldata agentId)
        external
        view
        agentExists(agentId)
        returns (Agent memory)
    {
        return agents[_key(agentId)];
    }

    function getSuccessRate(string calldata agentId)
        external
        view
        agentExists(agentId)
        returns (uint256)
    {
        Agent storage a = agents[_key(agentId)];
        if (a.matchesMade == 0) return 0;
        return (a.successfulProjects * 100) / a.matchesMade;
    }

    function getActions(string calldata agentId)
        external
        view
        returns (AgentAction[] memory)
    {
        return agentActions[_key(agentId)];
    }

    function totalAgents() external view returns (uint256) {
        return agentList.length;
    }
}
