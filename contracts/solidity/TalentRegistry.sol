// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TalentRegistry
 * @notice Stores contributor identity, skills, portfolio references and reputation metadata on Mantle.
 */
contract TalentRegistry {

    struct Contributor {
        address wallet;
        string  profileHash;   // IPFS hash of full profile JSON
        string  name;
        string  role;
        uint8   experienceYears;
        uint256 registeredAt;
        bool    verified;
        bool    exists;
    }

    // wallet => Contributor
    mapping(address => Contributor) private contributors;

    // list of all registered wallets
    address[] private contributorList;

    address public owner;

    event ContributorRegistered(address indexed wallet, string profileHash, uint256 timestamp);
    event ContributorUpdated(address indexed wallet, string profileHash, uint256 timestamp);
    event ContributorVerified(address indexed wallet, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyExisting(address wallet) {
        require(contributors[wallet].exists, "Contributor not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function register(
        string calldata profileHash,
        string calldata name,
        string calldata role,
        uint8  experienceYears
    ) external {
        require(!contributors[msg.sender].exists, "Already registered");
        require(bytes(profileHash).length > 0, "Profile hash required");
        require(bytes(name).length > 0, "Name required");

        contributors[msg.sender] = Contributor({
            wallet:          msg.sender,
            profileHash:     profileHash,
            name:            name,
            role:            role,
            experienceYears: experienceYears,
            registeredAt:    block.timestamp,
            verified:        false,
            exists:          true
        });

        contributorList.push(msg.sender);
        emit ContributorRegistered(msg.sender, profileHash, block.timestamp);
    }

    function updateProfile(
        string calldata profileHash,
        string calldata name,
        string calldata role,
        uint8  experienceYears
    ) external onlyExisting(msg.sender) {
        Contributor storage c = contributors[msg.sender];
        c.profileHash     = profileHash;
        c.name            = name;
        c.role            = role;
        c.experienceYears = experienceYears;
        emit ContributorUpdated(msg.sender, profileHash, block.timestamp);
    }

    function verify(address wallet) external onlyOwner onlyExisting(wallet) {
        contributors[wallet].verified = true;
        emit ContributorVerified(wallet, block.timestamp);
    }

    function getContributor(address wallet)
        external
        view
        onlyExisting(wallet)
        returns (Contributor memory)
    {
        return contributors[wallet];
    }

    function isRegistered(address wallet) external view returns (bool) {
        return contributors[wallet].exists;
    }

    function getAllContributors() external view returns (address[] memory) {
        return contributorList;
    }

    function totalContributors() external view returns (uint256) {
        return contributorList.length;
    }
}
