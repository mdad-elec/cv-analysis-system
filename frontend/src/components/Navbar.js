import React from 'react';
import { Box, Flex, Text, Button, Stack, useColorMode, IconButton } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

const NavItem = ({ children, to = '/', ...rest }) => {
  return (
    <RouterLink to={to}>
      <Button variant="ghost" {...rest}>
        {children}
      </Button>
    </RouterLink>
  );
};

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Box bg="brand.500" px={4} boxShadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="white">
            CV Analysis System
          </Text>
        </Box>

        <Flex alignItems="center">
          <Stack direction="row" spacing={4}>
            <NavItem to="/" color="white">Dashboard</NavItem>
            <NavItem to="/upload" color="white">Upload</NavItem>
            <NavItem to="/documents" color="white">Documents</NavItem>
            <NavItem to="/chatbot" color="white">Chatbot</NavItem>
            <IconButton
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              color="white"
              aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
              _hover={{ bg: 'brand.600' }}
            />
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar;