import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  Icon,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FiUpload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import FileUploader from '../components/FileUploader';
import { cvService } from '../services/api';

const Upload = () => {
  const [documentId, setDocumentId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!documentId) return;
    
    const checkStatus = async () => {
      try {
        const statusData = await cvService.getDocumentStatus(documentId);
        setStatus(statusData.status);
        
        if (statusData.status === 'pending') {
          setProgress(10);
        } else if (statusData.status === 'processing') {
          setProgress(50);
        } else if (statusData.status === 'completed') {
          setProgress(100);
          clearInterval(pollInterval);
          
          toast({
            title: 'Processing complete',
            description: 'Your CV has been successfully processed.',
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
        } else if (statusData.status === 'failed') {
          setProgress(0);
          clearInterval(pollInterval);
          setError(statusData.error_message || 'Processing failed');
          
          toast({
            title: 'Processing failed',
            description: statusData.error_message || 'An error occurred while processing your CV.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } catch (err) {
        console.error('Error checking document status:', err);
        setError('Failed to check document status');
      }
    };
    
    const interval = setInterval(checkStatus, 3000);
    setPollInterval(interval);
    
    checkStatus();
    
    return () => clearInterval(interval);
  }, [documentId, toast]);
  
  const handleUploadComplete = (id) => {
    setDocumentId(id);
    setStatus('pending');
    setProgress(10);
    setError(null);
  };
  
  const handleViewDocument = () => {
    navigate(`/documents/${documentId}`);
  };
  
  const handleUploadAnother = () => {
    setDocumentId(null);
    setStatus(null);
    setProgress(0);
    setError(null);
    clearInterval(pollInterval);
  };
  
  return (
    <Box>
      <Heading mb={6}>Upload CV</Heading>
      
      <Card mb={6}>
        <CardBody>
          <Text mb={4}>
            Upload a CV document (PDF or DOCX) for analysis. The system will extract information
            such as personal details, education, work experience, skills, and more.
          </Text>
          
          {!documentId ? (
            <FileUploader onUploadComplete={handleUploadComplete} />
          ) : (
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon 
                  as={
                    status === 'completed' ? FiCheckCircle : 
                    status === 'failed' ? FiAlertCircle : FiUpload
                  } 
                  color={
                    status === 'completed' ? 'green.500' : 
                    status === 'failed' ? 'red.500' : 'blue.500'
                  }
                  w={6}
                  h={6}
                />
                <Text fontWeight="bold">
                  {status === 'pending' && 'Preparing document...'}
                  {status === 'processing' && 'Processing document...'}
                  {status === 'completed' && 'Processing complete!'}
                  {status === 'failed' && 'Processing failed'}
                </Text>
              </HStack>
              
              {(status === 'pending' || status === 'processing') && (
                <Progress
                  value={progress}
                  size="sm"
                  colorScheme="blue"
                  borderRadius="md"
                  hasStripe
                  isAnimated
                />
              )}
              
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}
              
              <HStack spacing={4} mt={2}>
                {status === 'completed' && (
                  <Button leftIcon={<FiCheckCircle />} colorScheme="green" onClick={handleViewDocument}>
                    View Document
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleUploadAnother}>
                  Upload Another
                </Button>
              </HStack>
            </VStack>
          )}
        </CardBody>
      </Card>
      
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>Processing Information</Heading>
          
          <VStack align="start" spacing={2}>
            <Text>
              <strong>Document Types:</strong> PDF, DOCX
            </Text>
            <Text>
              <strong>Maximum Size:</strong> 10MB
            </Text>
            <Text>
              <strong>Processing Time:</strong> 1-3 minutes, depending on document complexity
            </Text>
            <Text>
              <strong>Information Extracted:</strong> Personal Information, Education, Work Experience, Skills, Projects, Certifications
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};
export default Upload;