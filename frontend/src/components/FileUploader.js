import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Center,
  Flex,
  Icon,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Progress,
  useToast,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { cvService } from '../services/api';

const FileUploader = ({ onUploadComplete }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or DOCX file.');
      return;
    }
    
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const nextProgress = prevProgress + 10;
          return nextProgress >= 90 ? 90 : nextProgress;
        });
      }, 500);
      
      // Upload file
      const result = await cvService.uploadDocument(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(true);
      
      toast({
        title: 'Upload successful',
        description: 'Your CV has been uploaded and is being processed.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onUploadComplete) {
        onUploadComplete(result.document_id);
      }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during upload.');
      
      toast({
        title: 'Upload failed',
        description: err.response?.data?.detail || 'An error occurred during upload.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Box width="100%">
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      <Flex
        {...getRootProps()}
        direction="column"
        align="center"
        justify="center"
        p={10}
        borderWidth={2}
        borderRadius="md"
        borderStyle="dashed"
        borderColor={isDragActive ? 'brand.500' : 'gray.300'}
        bg={isDragActive ? 'brand.50' : 'gray.50'}
        transition="all 0.2s"
        _hover={{ borderColor: 'brand.500', bg: 'brand.50' }}
        cursor={uploading ? 'not-allowed' : 'pointer'}
      >
        <input {...getInputProps()} />
        
        <Center h="100%" w="100%">
          <VStack spacing={4}>
            <Icon
              as={success ? FiCheckCircle : (error ? FiXCircle : (isDragActive ? FiFile : FiUpload))}
              w={12}
              h={12}
              color={success ? 'green.500' : (error ? 'red.500' : (isDragActive ? 'brand.500' : 'gray.400'))}
            />
            
            {uploading ? (
              <Text fontSize="lg" textAlign="center">Uploading...</Text>
            ) : (
              <Text fontSize="lg" textAlign="center">
                {isDragActive
                  ? 'Drop the file here'
                  : success
                  ? 'Upload complete!'
                  : 'Drag & drop your CV file here, or click to select'}
              </Text>
            )}
            
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Supported formats: PDF, DOCX
            </Text>
          </VStack>
        </Center>
      </Flex>
      
      {uploading && (
        <Progress
          value={uploadProgress}
          size="sm"
          colorScheme="blue"
          mt={4}
          borderRadius="md"
          hasStripe
          isAnimated
        />
      )}
      
      <Button
        mt={4}
        colorScheme="blue"
        isLoading={uploading}
        loadingText="Uploading"
        onClick={() => document.getElementById('fileInput').click()}
        width="full"
        isDisabled={uploading}
      >
        Select CV File
      </Button>
    </Box>
  );
};

export default FileUploader;