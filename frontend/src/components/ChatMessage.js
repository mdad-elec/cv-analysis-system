import React from 'react';
import { Box, Flex, Text, Avatar, VStack } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message, isUser }) => {
  return (
    <Flex
      direction={isUser ? 'row-reverse' : 'row'}
      align="start"
      my={4}
      width="100%"
    >
      <Avatar
        size="sm"
        name={isUser ? 'You' : 'Assistant'}
        bg={isUser ? 'blue.500' : 'gray.500'}
        color="white"
        mr={isUser ? 0 : 2}
        ml={isUser ? 2 : 0}
      />
      
      <Box
        maxWidth="80%"
        bg={isUser ? 'blue.50' : 'gray.100'}
        p={3}
        borderRadius="lg"
        borderTopLeftRadius={isUser ? 'lg' : 'sm'}
        borderTopRightRadius={isUser ? 'sm' : 'lg'}
      >
        <VStack align="start" spacing={2}>
          <Text fontWeight="bold" fontSize="sm" color={isUser ? 'blue.500' : 'gray.500'}>
            {isUser ? 'You' : 'CV Assistant'}
          </Text>
          
          <Box className="markdown-content" width="100%">
            <ReactMarkdown>{message}</ReactMarkdown>
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
};

export default ChatMessage;