import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useToast,
} from '@chakra-ui/react';
import { FiEye, FiDownload, FiTrash2, FiMoreVertical, FiPlus } from 'react-icons/fi';
import { cvService } from '../services/api';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await cvService.getDocuments();
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document) => {
    setDocumentToDelete(document);
    onOpen();
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      await cvService.deleteDocument(documentToDelete._id);
      
      setDocuments(documents.filter(doc => doc._id !== documentToDelete._id));
      
      toast({
        title: 'Document deleted',
        description: `${documentToDelete.filename} has been deleted.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error deleting document:', err);
      
      toast({
        title: 'Error',
        description: 'Failed to delete document. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onClose();
      setDocumentToDelete(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge colorScheme="green">Completed</Badge>;
      case 'failed':
        return <Badge colorScheme="red">Failed</Badge>;
      case 'processing':
        return <Badge colorScheme="blue">Processing</Badge>;
      case 'pending':
        return <Badge colorScheme="yellow">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading>Documents</Heading>
        <Button
          as={RouterLink}
          to="/upload"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          Upload New
        </Button>
      </HStack>
      
      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      <Card>
        <CardBody>
          {loading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={4}>Loading documents...</Text>
            </Box>
          ) : documents.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text mb={4}>No documents have been uploaded yet.</Text>
              <Button
                as={RouterLink}
                to="/upload"
                leftIcon={<FiPlus />}
                colorScheme="blue"
              >
                Upload a Document
              </Button>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Filename</Th>
                    <Th>Upload Date</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {documents.map((doc) => (
                    <Tr key={doc._id}>
                      <Td fontWeight="medium">{doc.filename}</Td>
                      <Td>{new Date(doc.upload_date).toLocaleString()}</Td>
                      <Td>{doc.file_type.toUpperCase()}</Td>
                      <Td>{getStatusBadge(doc.status)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            aria-label="View document"
                            icon={<FiEye />}
                            size="sm"
                            as={RouterLink}
                            to={`/documents/${doc._id}`}
                            isDisabled={doc.status !== 'completed'}
                          />
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="More options"
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem 
                                icon={<FiTrash2 />} 
                                color="red.500"
                                onClick={() => handleDeleteClick(doc)}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
      
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete{" "}
            <Text as="span" fontWeight="bold">
              {documentToDelete?.filename}
            </Text>
            ? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Documents;