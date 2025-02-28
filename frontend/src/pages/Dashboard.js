import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardBody,
  Stack,
  Text,
  Divider,
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Icon,
  List,
  ListItem,
  ListIcon,
  Spinner,
} from '@chakra-ui/react';
import { FiFileText, FiCheckCircle, FiAlertCircle, FiClock, FiServer, FiRefreshCw } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { cvService, healthService } from '../services/api';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [healthStatus, setHealthStatus] = useState({
    mongodb: 'unknown',
    redis: 'unknown', 
    anthropic: 'unknown',
    status: 'unknown'
  });
  const [loading, setLoading] = useState(true);
  const [healthRetries, setHealthRetries] = useState(0);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealthStatus = async (maxRetries = 5, initialDelay = 2000) => {
    let retries = 0;
    let delay = initialDelay;
    
    setHealthLoading(true);
    
    const attemptFetch = async () => {
      try {
        const healthData = await healthService.getHealth();
        console.log("Health data received:", healthData);
        
        if (healthData.mongodb === 'up' && healthData.redis === 'up' && healthData.anthropic === 'up') {
          setHealthStatus(healthData);
          setHealthLoading(false);
          return true;
        } else {
          setHealthStatus(healthData);
          
          if (retries < maxRetries) {
            console.log(`Services not all ready, retry ${retries + 1}/${maxRetries} in ${delay/1000}s`);
            retries++;
            setHealthRetries(retries);
            
            delay = Math.min(delay * 1.5, 10000); 
            
            setTimeout(attemptFetch, delay);
            return false;
          } else {
            console.log("Max retries reached, using last health status");
            setHealthLoading(false);
            return true;
          }
        }
      } catch (err) {
        console.error('Error fetching health data:', err);
        
        if (retries < maxRetries) {
          console.log(`Health check failed, retry ${retries + 1}/${maxRetries} in ${delay/1000}s`);
          retries++;
          setHealthRetries(retries);
          
          delay = Math.min(delay * 1.5, 10000);
          
          setTimeout(attemptFetch, delay);
          return false;
        } else {
          console.log("Max retries reached, health check failed");
          setHealthStatus({
            mongodb: 'down',
            redis: 'down',
            anthropic: 'down',
            status: 'down'
          });
          setHealthLoading(false);
          return true;
        }
      }
    };
    
    return attemptFetch();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const docsData = await cvService.getDocuments();
        setDocuments(docsData);
        
        await fetchHealthStatus();
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshHealth = () => {
    setHealthRetries(0);
    fetchHealthStatus();
  };

  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const failedDocuments = documents.filter(doc => doc.status === 'failed').length;
  const pendingDocuments = documents.filter(doc => ['pending', 'processing'].includes(doc.status)).length;
  
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
    .slice(0, 5);

  return (
    <Box>
      <Heading mb={6}>Dashboard</Heading>
      
      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <Skeleton isLoaded={!loading}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Documents</StatLabel>
                <StatNumber>{totalDocuments}</StatNumber>
                <StatHelpText>
                  <Icon as={FiFileText} mr={1} />
                  Uploaded CVs
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Skeleton>
        
        <Skeleton isLoaded={!loading}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Processed Documents</StatLabel>
                <StatNumber>{completedDocuments}</StatNumber>
                <StatHelpText>
                  <Icon as={FiCheckCircle} mr={1} color="green.500" />
                  Successfully processed
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Skeleton>
        
        <Skeleton isLoaded={!loading}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Failed Documents</StatLabel>
                <StatNumber>{failedDocuments}</StatNumber>
                <StatHelpText>
                  <Icon as={FiAlertCircle} mr={1} color="red.500" />
                  Processing errors
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Skeleton>
        
        <Skeleton isLoaded={!loading}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pending Documents</StatLabel>
                <StatNumber>{pendingDocuments}</StatNumber>
                <StatHelpText>
                  <Icon as={FiClock} mr={1} color="yellow.500" />
                  Awaiting processing
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Skeleton>
      </SimpleGrid>
      
      <Card mb={8}>
        <CardBody>
          <Stack direction="row" justify="space-between" align="center" mb={4}>
            <Heading size="md">System Status</Heading>
            {healthLoading ? (
              <Stack direction="row" align="center" spacing={2}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">
                  Checking services (retry {healthRetries})...
                </Text>
              </Stack>
            ) : (
              <Box 
                as="button" 
                onClick={refreshHealth}
                display="flex"
                alignItems="center"
                color="gray.500"
                _hover={{ color: "brand.500" }}
              >
                <Icon as={FiRefreshCw} mr={1} />
                <Text fontSize="sm">Refresh</Text>
              </Box>
            )}
          </Stack>
          
          <Skeleton isLoaded={!loading}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box>
                <Stack direction="row" align="center" mb={2}>
                  <Icon 
                    as={FiServer} 
                    color={healthStatus.mongodb === 'up' ? 'green.500' : 'red.500'} 
                  />
                  <Text fontWeight="bold">MongoDB</Text>
                </Stack>
                <Text>Status: {healthStatus.mongodb === 'up' ? 'Connected' : 'Disconnected'}</Text>
              </Box>
              
              <Box>
                <Stack direction="row" align="center" mb={2}>
                  <Icon 
                    as={FiServer} 
                    color={healthStatus.redis === 'up' ? 'green.500' : 'red.500'} 
                  />
                  <Text fontWeight="bold">Redis</Text>
                </Stack>
                <Text>Status: {healthStatus.redis === 'up' ? 'Connected' : 'Disconnected'}</Text>
              </Box>
              
              <Box>
                <Stack direction="row" align="center" mb={2}>
                  <Icon 
                    as={FiServer} 
                    color={healthStatus.anthropic === 'up' ? 'green.500' : 'red.500'} 
                  />
                  <Text fontWeight="bold">Anthropic API</Text>
                </Stack>
                <Text>Status: {healthStatus.anthropic === 'up' ? 'Connected' : 'Disconnected'}</Text>
              </Box>
            </SimpleGrid>
          </Skeleton>
        </CardBody>
      </Card>
      
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>Recent Documents</Heading>
          
          <Skeleton isLoaded={!loading}>
            {recentDocuments.length > 0 ? (
              <List spacing={3}>
                {recentDocuments.map(doc => (
                  <ListItem key={doc._id}>
                    <Box as={RouterLink} to={`/documents/${doc._id}`} _hover={{ textDecoration: 'none' }}>
                      <Stack direction="row" align="center">
                        <ListIcon 
                          as={
                            doc.status === 'completed' ? FiCheckCircle : 
                            doc.status === 'failed' ? FiAlertCircle : FiClock
                          } 
                          color={
                            doc.status === 'completed' ? 'green.500' : 
                            doc.status === 'failed' ? 'red.500' : 'yellow.500'
                          }
                        />
                        <Text fontWeight="medium">{doc.filename}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {new Date(doc.upload_date).toLocaleDateString()}
                        </Text>
                        <Text 
                          fontSize="sm" 
                          color={
                            doc.status === 'completed' ? 'green.500' : 
                            doc.status === 'failed' ? 'red.500' : 'yellow.500'
                          }
                          ml="auto"
                        >
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </Text>
                      </Stack>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Text color="gray.500">No documents uploaded yet.</Text>
            )}
          </Skeleton>
          
          {recentDocuments.length > 0 && (
            <>
              <Divider my={4} />
              <Box as={RouterLink} to="/documents" color="brand.500" fontWeight="medium">
                View all documents
              </Box>
            </>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default Dashboard;