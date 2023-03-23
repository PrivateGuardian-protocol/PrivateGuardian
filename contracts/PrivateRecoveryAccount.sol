// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "./core/BaseAccount.sol";
import "./GuardianStorage.sol";

/**
  * minimal account.
  *  this is sample minimal account.
  *  has execute, eth handling methods
  *  has a single signer that can send requests through the entryPoint.
  */
contract PrivateRecoveryAccount is BaseAccount, UUPSUpgradeable, Initializable {
    using ECDSA for bytes32;
    using GuardianStorage for GuardianStorage.Layout;

    //filler member, to push the nonce and owner to the same slot
    // the "Initializeble" class takes 2 bytes in the first slot
    bytes28 private _filler;

    //explicit sizes of nonce, to fit a single storage cell with "owner"
    uint96 private _nonce;
    address public owner;
    address public pendingOwner;

    IEntryPoint private immutable _entryPoint;

    event PrivateRecoveryAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /// @inheritdoc BaseAccount
    function nonce() public view virtual override returns (uint256) {
        return _nonce;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }


    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(msg.sender == owner || msg.sender == address(this), "only owner");
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of PrivateRecoveryAccount must be deployed with the new EntryPoint address, then upgrading
      * the implementation by calling `upgradeTo()`
     */
    function initialize(address anOwner) public virtual initializer {
        _initialize(anOwner);
    }

    function _initialize(address anOwner) internal virtual {
        owner = anOwner;
        emit PrivateRecoveryAccountInitialized(_entryPoint, owner);
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "account: not Owner or EntryPoint");
    }

    /// implement template method of BaseAccount
    function _validateAndUpdateNonce(UserOperation calldata userOp) internal override {
        require(_nonce++ == userOp.nonce, "account: invalid nonce");
    }

    /// implement template method of BaseAccount
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal override virtual returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value : value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value : msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }

    /**
     * get current guardians
     */
    function getGuardians() external view returns (uint[] memory) {
        return GuardianStorage.layout().getGuardians();
    }

    /**
     * initialize guardians
     * @param guardians guardian list
     * @param vote_threshold threshold to update owner
     * @param root merkle root
     * @param updateGuardianVerifierAddress update guardian contract address
     * @param socialRecoveryVerifierAddress social recovery contract address
     * @param poseidonContractAddress poseidon hasher contract address
     */
    function initilizeGuardians(
      uint[] memory guardians,
      uint vote_threshold,
      uint root,
      address updateGuardianVerifierAddress,
      address socialRecoveryVerifierAddress,
      address poseidonContractAddress
    ) external onlyOwner {
      GuardianStorage.layout().initialize(
        guardians,
        vote_threshold,
        root,
        updateGuardianVerifierAddress,
        socialRecoveryVerifierAddress ,
        poseidonContractAddress
      );
    }

    /**
     * update guardian by a proof
     * @param a proof parameter
     * @param b proof parameter
     * @param c proof parameter
     * @param input proof input
     */
    function updateGuardian(
      uint[2] memory a,
      uint[2][2] memory b,
      uint[2] memory c,
      uint[6] memory input
    ) external returns (bool) {
      return GuardianStorage.layout().updateGuardian(a, b, c, input);
    }

    /**
     * recover owner
     * @param newOwner new owner
     * @param a proof parameter
     * @param b proof parameter
     * @param c proof parameter
     * @param input proof input
     */
    function recover(
      address newOwner,
      uint[2] memory a,
      uint[2][2] memory b,
      uint[2] memory c,
      uint[3] memory input
    ) external returns (bool valid, bool update) {
      require(pendingOwner == address(0) || newOwner == pendingOwner, "Wrong new owner");
      (valid, update) = GuardianStorage.layout().recover(a, b, c, input, newOwner);
      if(valid && update) {
        owner = newOwner;
        pendingOwner = address(0);
      }
    }
}