import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  IconButton,
  Text,
  Divider,
  Flex,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiSend, FiInfo } from 'react-icons/fi';
import ChatMessage from '../components/ChatMessage';
import { queryService, cvService } from '../services/api';

const MAX_CONVERSATION_HISTORY = 10000;
const MIN_CONVERSATION_MESSAGES = 5;

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    const checkDocuments = async () => {
      try {
        const documents = await cvService.getDocuments();
        const processedDocs = documents.filter(doc => doc.status === 'completed');
        setDocumentCount(processedDocs.length);
        
        if (messages.length === 0) {
          const welcomeMessage = processedDocs.length > 0
            ? "Hello! I can help you analyze and query the CV data. Ask me about candidates with specific skills, education, or experience."
            : "Welcome! It looks like there are no processed CVs in the system yet. Please upload some documents first so I can help you analyze them.";
          
          setMessages([{ text: welcomeMessage, isUser: false }]);
        }
      } catch (error) {
        console.error('Error checking documents:', error);
        setErrorDetails(`Failed to get documents: ${error.message || 'Unknown error'}`);
      }
    };
    
    checkDocuments();
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatConversationForContext = () => {

    const structuredHistory = [];
    
    // Group messages into Q&A pairs
    let currentPair = { user: null, assistant: null };
    
    // Process messages in reverse to get most recent first
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      
      if (msg.isUser && currentPair.user === null) {
        currentPair.user = msg.text;
      } else if (!msg.isUser && currentPair.assistant === null && currentPair.user !== null) {
        currentPair.assistant = msg.text;
        
        // Complete pair found, add to history
        structuredHistory.unshift({...currentPair});
        
        // Reset for next pair
        currentPair = { user: null, assistant: null };
      } else if (msg.isUser) {
        // Found a user message when we already have one - start a new pair
        if (currentPair.user !== null && currentPair.assistant === null) {
          // Discard incomplete pair
          currentPair = { user: msg.text, assistant: null };
        }
      }
    }
    
    // Only keep last 5 complete pairs to avoid context length issues
    const recentHistory = structuredHistory.slice(-5);
    
    // Format history as a string with clear user/assistant labels
    return recentHistory
      .map(pair => `User: ${pair.user}\nAssistant: ${pair.assistant}`)
      .join('\n\n');
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = { text: inputText, isUser: true };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    setConversationHistory(prev => [...prev, userMessage]);
    
    setInputText('');
    
    if (documentCount === 0) {
      const noDocsMessage = { 
        text: "I don't have any processed CV data to query. Please upload and process some documents first.", 
        isUser: false 
      };
      
      setMessages(prevMessages => [...prevMessages, noDocsMessage]);
      setConversationHistory(prev => [...prev, noDocsMessage]);
      return;
    }
    
    setIsLoading(true);
    setErrorDetails(null);
    
    try {
      const context = formatConversationForContext();
      
      // Send query to backend
      const response = await queryService.query(inputText, context);
      
      // Create assistant response object
      const assistantResponse = { 
        text: response.response, 
        isUser: false 
      };
      
      // Update conversation history with the assistant's response
      setConversationHistory(prev => {
        const updated = [...prev, assistantResponse];
        
        // Prune conversation history if it gets too long
        if (JSON.stringify(updated).length > MAX_CONVERSATION_HISTORY) {
          // Work with pairs to keep conversations coherent
          const pairs = [];
          let currentPair = [];
          
          for (let i = updated.length - 1; i >= 0; i--) {
            currentPair.unshift(updated[i]);
            
            // When we have a pair (user + assistant)
            if (currentPair.length === 2) {
              pairs.unshift(currentPair);
              currentPair = [];
            }
          }
          
          // Keep first pair (might be incomplete) + recent complete pairs
          const keptPairs = pairs.slice(0, Math.max(MIN_CONVERSATION_MESSAGES / 2, 5));
          return keptPairs.flat();
        }
        
        return updated;
      });
      
      setMessages(prevMessages => [
        ...prevMessages,
        assistantResponse
      ]);
    } catch (error) {
      console.error('Error querying CV data:', error);
      
      const errorMsg = error.response?.data?.detail || 'Failed to process your query. Please try again.';
      setErrorDetails(errorMsg);
      
      toast({
        title: 'Query Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      const errorResponse = { 
        text: "I'm sorry, I encountered an error processing your query. Please try again.", 
        isUser: false 
      };
      
      setMessages(prevMessages => [...prevMessages, errorResponse]);
      setConversationHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    const welcomeMessage = {
      text: "Conversation history cleared. What would you like to ask about the CV data?",
      isUser: false
    };
    
    setMessages([welcomeMessage]);
    setConversationHistory([welcomeMessage]);
    setErrorDetails(null);
  };

  return (
    <Box>
      <Heading mb={6}>CV Assistant</Heading>
      
      <Card height="70vh" display="flex" flexDirection="column">
        <CardHeader pb={0}>
          <Flex justifyContent="space-between" alignItems="center">
            <HStack>
              <Heading size="md">CV Query Assistant</Heading>
              <Text color="gray.500" fontSize="sm" ml={2}>
                {documentCount} {documentCount === 1 ? 'document' : 'documents'} available
              </Text>
            </HStack>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="outline" 
              onClick={clearConversation}
            >
              Clear Chat
            </Button>
          </Flex>
          <Divider mt={3} />
        </CardHeader>
        
        <CardBody 
          flex="1" 
          overflowY="auto" 
          display="flex" 
          flexDirection="column"
          p={4}
        >
          <VStack spacing={4} align="stretch" flex="1">
            <Box flex="1">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message.text} 
                  isUser={message.isUser} 
                />
              ))}
              
              {isLoading && (
                <Flex justify="center" my={6}>
                  <Spinner size="md" color="blue.500" />
                </Flex>
              )}
              
              {errorDetails && (
                <Alert status="error" mt={4} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Error Details</AlertTitle>
                    <AlertDescription fontSize="sm">
                      {errorDetails}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
              
              <div ref={messagesEndRef} />
            </Box>
          </VStack>
        </CardBody>
        
        <Box p={4} borderTop="1px solid" borderColor="gray.200">
          <HStack>
            <Input
              placeholder="Ask about candidates, skills, experience..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <IconButton
              aria-label="Send message"
              icon={<FiSend />}
              colorScheme="blue"
              onClick={handleSendMessage}
              isLoading={isLoading}
              isDisabled={!inputText.trim()}
            />
          </HStack>
          
          {documentCount === 0 && (
            <HStack mt={2} color="orange.500" fontSize="sm">
              <FiInfo />
              <Text>No processed documents available. Please upload CVs first.</Text>
            </HStack>
          )}
        </Box>
      </Card>
      
      <Card mt={6}>
        <CardBody>
          <Heading size="md" mb={4}>Example Questions</Heading>
          
          <VStack align="start" spacing={2}>
            <Text fontWeight="medium">• Who has experience with Python?</Text>
            <Text fontWeight="medium">• Find candidates with a Master's degree</Text>
            <Text fontWeight="medium">• Which candidates have worked at tech companies?</Text>
            <Text fontWeight="medium">• Compare the skills of all candidates</Text>
            <Text fontWeight="medium">• Who would be a good fit for a Senior Developer role?</Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Chatbot;