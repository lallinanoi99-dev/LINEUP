// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Remix: deploy the contract named "Lineup" from this file (CONTRACT dropdown).
// Tested on BOT Chain mainnet (677) with solc 0.8.24–0.8.30, EVM paris and prague.

/// @title Lineup — on-chain launch waitlists with referral boosts
/// @notice Anyone can create a waitlist. People join with their wallet and can
///         name a referrer who is already in the same list. Each counted
///         referral moves the referrer up `boost` spots, up to `cap` referrals.
///         No payments, no tokens, no admin. Spots are for fun and early access.
contract Lineup {
    struct List {
        address creator;
        string name;
        string pitch;
        string reward;
        uint8 color;
        uint64 launchAt;
        uint32 maxSpots; // 0 = unlimited
        uint8 boost;     // spots gained per counted referral (1-10)
        uint8 cap;       // max referrals counted (0-50)
        bool minBalance; // joiner must hold >= MIN_BALANCE
        uint32 count;
        bool closed;
    }

    uint256 public constant MIN_BALANCE = 0.001 ether;
    uint8 public constant COLORS = 6;

    List[] public lists;
    /// @notice Emoji / short icon per list (kept outside the struct to keep the PRD struct shape).
    mapping(uint256 => string) public iconOf;

    mapping(uint256 => mapping(address => uint32)) public joinNo;      // 0 = not joined
    mapping(uint256 => mapping(address => uint32)) public referrals;   // raw count
    mapping(uint256 => mapping(address => address)) public referrerOf;
    mapping(uint256 => mapping(address => uint64)) public joinedAt;
    mapping(uint256 => address[]) internal members;                     // index = joinNo - 1

    mapping(address => uint256[]) internal joinedBy;
    mapping(address => uint256[]) internal createdBy;

    uint256 public totalSpots;

    event ListCreated(uint256 indexed id, address indexed creator);
    event Joined(uint256 indexed id, address indexed who, uint32 joinNo, address indexed ref);
    event Closed(uint256 indexed id);

    error BadInput(string what);
    error NoSuchList();
    error ListClosed();
    error ListFull();
    error AlreadyJoined();
    error BalanceTooLow();
    error NotCreator();

    // ───────────────────────── writes ─────────────────────────

    function createList(
        string memory name,
        string memory pitch,
        string memory reward,
        string memory icon,
        uint8 color,
        uint64 launchAt,
        uint32 maxSpots,
        uint8 boost,
        uint8 cap,
        bool minBalance
    ) external returns (uint256 id) {
        if (bytes(name).length == 0 || bytes(name).length > 40) revert BadInput("name");
        if (bytes(pitch).length > 120) revert BadInput("pitch");
        if (bytes(reward).length > 80) revert BadInput("reward");
        if (bytes(icon).length > 16) revert BadInput("icon");
        if (color >= COLORS) revert BadInput("color");
        if (launchAt <= block.timestamp) revert BadInput("launchAt");
        if (boost < 1 || boost > 10) revert BadInput("boost");
        if (cap > 50) revert BadInput("cap");

        id = lists.length;
        List storage l = lists.push();
        l.creator = msg.sender;
        l.name = name;
        l.pitch = pitch;
        l.reward = reward;
        l.color = color;
        l.launchAt = launchAt;
        l.maxSpots = maxSpots;
        l.boost = boost;
        l.cap = cap;
        l.minBalance = minBalance;
        iconOf[id] = icon;
        createdBy[msg.sender].push(id);
        emit ListCreated(id, msg.sender);
    }

    /// @param ref Referrer. Ignored (treated as none) if zero, self, or not in this list.
    function join(uint256 id, address ref) external {
        if (id >= lists.length) revert NoSuchList();
        List storage l = lists[id];
        if (l.closed) revert ListClosed();
        if (l.maxSpots != 0 && l.count >= l.maxSpots) revert ListFull();
        if (joinNo[id][msg.sender] != 0) revert AlreadyJoined();
        if (l.minBalance && msg.sender.balance < MIN_BALANCE) revert BalanceTooLow();

        uint32 no = ++l.count;
        joinNo[id][msg.sender] = no;
        joinedAt[id][msg.sender] = uint64(block.timestamp);
        members[id].push(msg.sender);
        joinedBy[msg.sender].push(id);
        unchecked { totalSpots++; }

        if (ref != address(0) && ref != msg.sender && joinNo[id][ref] != 0) {
            referrerOf[id][msg.sender] = ref;
            referrals[id][ref]++; // raw count; only min(raw, cap) moves the referrer
        } else {
            ref = address(0);
        }
        emit Joined(id, msg.sender, no, ref);
    }

    function close(uint256 id) external {
        if (id >= lists.length) revert NoSuchList();
        List storage l = lists[id];
        if (msg.sender != l.creator) revert NotCreator();
        if (l.closed) revert ListClosed();
        l.closed = true;
        emit Closed(id);
    }

    // ───────────────────────── views ─────────────────────────

    function listCount() external view returns (uint256) {
        return lists.length;
    }

    function getList(uint256 id) external view returns (List memory l, string memory icon) {
        if (id >= lists.length) revert NoSuchList();
        return (lists[id], iconOf[id]);
    }

    function countedReferrals(uint256 id, address who) public view returns (uint32) {
        uint32 r = referrals[id][who];
        uint32 c = lists[id].cap;
        return r < c ? r : c;
    }

    /// @notice max(1, joinNo - boost * countedReferrals). Lower is better; ties → earlier joinNo.
    ///         Returns 0 if `who` is not in the list.
    function positionScore(uint256 id, address who) public view returns (uint32) {
        if (id >= lists.length) revert NoSuchList();
        uint32 no = joinNo[id][who];
        if (no == 0) return 0;
        uint256 bonus = uint256(lists[id].boost) * countedReferrals(id, who);
        return bonus >= no ? 1 : uint32(no - bonus);
    }

    function getMember(uint256 id, address who)
        external
        view
        returns (uint32 no, uint32 refs, uint32 counted, address referrer, uint64 at, uint32 score)
    {
        if (id >= lists.length) revert NoSuchList();
        no = joinNo[id][who];
        refs = referrals[id][who];
        counted = countedReferrals(id, who);
        referrer = referrerOf[id][who];
        at = joinedAt[id][who];
        score = positionScore(id, who);
    }

    /// @notice Page through members in join order (offset 0 = join #1).
    function getMembers(uint256 id, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory who, uint32[] memory refs, address[] memory referrer, uint64[] memory at)
    {
        if (id >= lists.length) revert NoSuchList();
        address[] storage m = members[id];
        uint256 end = offset + limit;
        if (end > m.length) end = m.length;
        uint256 len = end > offset ? end - offset : 0;
        who = new address[](len);
        refs = new uint32[](len);
        referrer = new address[](len);
        at = new uint64[](len);
        for (uint256 i; i < len; ++i) {
            address a = m[offset + i];
            who[i] = a;
            refs[i] = referrals[id][a];
            referrer[i] = referrerOf[id][a];
            at[i] = joinedAt[id][a];
        }
    }

    function listsOf(address who) external view returns (uint256[] memory created, uint256[] memory joined) {
        return (createdBy[who], joinedBy[who]);
    }

    function stats() external view returns (uint256 listTotal, uint256 spotTotal) {
        return (lists.length, totalSpots);
    }
}
