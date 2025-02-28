import React from 'react';
import { ChakraProvider, Box, CSSReset } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Chatbot from './pages/Chatbot';
import Documents from './pages/Documents';
import DocumentView from './pages/DocumentView';
import theme from './theme';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <Router>
        <Box minH="100vh">
          <Navbar />
          <Box as="main" p={4}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:id" element={<DocumentView />} />
              <Route path="/chatbot" element={<Chatbot />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ChakraProvider>
  );
}

export default App;