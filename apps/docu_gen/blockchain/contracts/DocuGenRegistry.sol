// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocuGenRegistry
 * @dev Smart contract for registering and verifying DocuGen documents on Polygon blockchain
 * @notice This contract provides immutable provenance for documents with version history tracking
 */
contract DocuGenRegistry {

    // ============================================
    // State Variables
    // ============================================

    /**
     * @dev Document structure containing all metadata
     */
    struct Document {
        bytes32 documentHash;      // SHA-256 hash of document
        string ipfsCID;            // IPFS Content Identifier for encrypted document
        string docType;            // Type of document (invoice, receipt, etc.)
        address creator;           // Address of document creator
        uint256 timestamp;         // Block timestamp when registered
        bytes32[] versionHistory;  // Array of previous document hashes (for updates)
    }

    // Mapping from document hash to Document struct
    mapping(bytes32 => Document) public documents;

    // Total number of documents registered
    uint256 public documentCount;

    // ============================================
    // Events
    // ============================================

    /**
     * @dev Emitted when a new document is registered
     */
    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed creator,
        string ipfsCID,
        string docType,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a document is updated (new version created)
     */
    event DocumentUpdated(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        address indexed updater,
        uint256 timestamp
    );

    // ============================================
    // Modifiers
    // ============================================

    /**
     * @dev Checks if document exists
     */
    modifier documentExists(bytes32 _documentHash) {
        require(documents[_documentHash].timestamp != 0, "Document not found");
        _;
    }

    /**
     * @dev Checks if caller is the document creator
     */
    modifier onlyCreator(bytes32 _documentHash) {
        require(
            documents[_documentHash].creator == msg.sender,
            "Only creator can perform this action"
        );
        _;
    }

    // ============================================
    // Core Functions
    // ============================================

    /**
     * @notice Register a new document on the blockchain
     * @param _documentHash SHA-256 hash of the document (as bytes32)
     * @param _ipfsCID IPFS Content Identifier where encrypted document is stored
     * @param _docType Type of document (e.g., "invoice", "receipt", "bank_statement")
     * @dev Reverts if document with same hash already exists
     */
    function registerDocument(
        bytes32 _documentHash,
        string memory _ipfsCID,
        string memory _docType
    ) public {
        require(_documentHash != bytes32(0), "Invalid document hash");
        require(bytes(_ipfsCID).length > 0, "IPFS CID cannot be empty");
        require(bytes(_docType).length > 0, "Document type cannot be empty");
        require(documents[_documentHash].timestamp == 0, "Document already exists");

        // Create new document
        documents[_documentHash] = Document({
            documentHash: _documentHash,
            ipfsCID: _ipfsCID,
            docType: _docType,
            creator: msg.sender,
            timestamp: block.timestamp,
            versionHistory: new bytes32[](0)
        });

        documentCount++;

        emit DocumentRegistered(
            _documentHash,
            msg.sender,
            _ipfsCID,
            _docType,
            block.timestamp
        );
    }

    /**
     * @notice Get document information by hash
     * @param _documentHash The hash of the document to retrieve
     * @return ipfsCID IPFS Content Identifier
     * @return docType Type of document
     * @return creator Address of document creator
     * @return timestamp When document was registered
     * @return versionHistory Array of previous document hashes
     */
    function getDocument(bytes32 _documentHash)
        public
        view
        documentExists(_documentHash)
        returns (
            string memory ipfsCID,
            string memory docType,
            address creator,
            uint256 timestamp,
            bytes32[] memory versionHistory
        )
    {
        Document memory doc = documents[_documentHash];
        return (
            doc.ipfsCID,
            doc.docType,
            doc.creator,
            doc.timestamp,
            doc.versionHistory
        );
    }

    /**
     * @notice Update an existing document (creates new version with history link)
     * @param _oldHash Hash of the original document
     * @param _newHash Hash of the updated document
     * @param _newIPFSCID IPFS CID of the new document version
     * @dev Only the original creator can update. Creates full version chain.
     */
    function updateDocument(
        bytes32 _oldHash,
        bytes32 _newHash,
        string memory _newIPFSCID
    )
        public
        documentExists(_oldHash)
        onlyCreator(_oldHash)
    {
        require(_newHash != bytes32(0), "Invalid new document hash");
        require(bytes(_newIPFSCID).length > 0, "New IPFS CID cannot be empty");
        require(documents[_newHash].timestamp == 0, "New document hash already exists");

        Document storage oldDoc = documents[_oldHash];

        // Create new version with full version history
        bytes32[] memory newHistory = new bytes32[](oldDoc.versionHistory.length + 1);

        // Copy old version history
        for (uint i = 0; i < oldDoc.versionHistory.length; i++) {
            newHistory[i] = oldDoc.versionHistory[i];
        }

        // Add current version to history
        newHistory[oldDoc.versionHistory.length] = _oldHash;

        // Create new document version
        documents[_newHash] = Document({
            documentHash: _newHash,
            ipfsCID: _newIPFSCID,
            docType: oldDoc.docType,
            creator: msg.sender,
            timestamp: block.timestamp,
            versionHistory: newHistory
        });

        documentCount++;

        emit DocumentUpdated(_oldHash, _newHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify if a document exists on the blockchain
     * @param _documentHash Hash to verify
     * @return exists True if document exists, false otherwise
     * @return registrationTime Timestamp when document was registered (0 if doesn't exist)
     */
    function verifyDocument(bytes32 _documentHash)
        public
        view
        returns (bool exists, uint256 registrationTime)
    {
        uint256 timestamp = documents[_documentHash].timestamp;
        return (timestamp != 0, timestamp);
    }

    /**
     * @notice Get version history of a document
     * @param _documentHash Hash of the document
     * @return versionHistory Array of all previous versions
     */
    function getVersionHistory(bytes32 _documentHash)
        public
        view
        documentExists(_documentHash)
        returns (bytes32[] memory versionHistory)
    {
        return documents[_documentHash].versionHistory;
    }

    /**
     * @notice Check if caller is the creator of a document
     * @param _documentHash Hash of the document
     * @return isCreator True if msg.sender created the document
     */
    function isDocumentCreator(bytes32 _documentHash)
        public
        view
        documentExists(_documentHash)
        returns (bool isCreator)
    {
        return documents[_documentHash].creator == msg.sender;
    }

    // ============================================
    // Utility Functions
    // ============================================

    /**
     * @notice Get total number of documents registered
     * @return count Total document count
     */
    function getTotalDocuments() public view returns (uint256 count) {
        return documentCount;
    }
}
