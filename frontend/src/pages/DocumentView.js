import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Divider,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stack,
  HStack,
  VStack,
  List,
  ListItem,
  ListIcon,
  Skeleton,
  Alert,
  AlertIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
} from '@chakra-ui/react';
import { 
  FiArrowLeft, 
  FiUser, 
  FiBook, 
  FiBriefcase, 
  FiAward, 
  FiTool, 
  FiFolder,
  FiCalendar,
  FiMail,
  FiPhone,
  FiGlobe,
  FiMapPin,
  FiExternalLink,
  FiCheckCircle
} from 'react-icons/fi';
import { cvService } from '../services/api';

const DocumentView = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const data = await cvService.getDocument(id);
        setDocument(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document. It may have been deleted or is still processing.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const isProcessed = document && document.parsed_data && document.status === 'completed';

  return (
    <Box>
      <Button
        as={RouterLink}
        to="/documents"
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        mb={6}
      >
        Back to Documents
      </Button>
      
      {loading ? (
        <Stack spacing={4}>
          <Skeleton height="40px" width="50%" />
          <Skeleton height="300px" />
        </Stack>
      ) : error ? (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <>
          <HStack justify="space-between" mb={6}>
            <Heading size="lg">{document.filename}</Heading>
            <Badge colorScheme={document.status === 'completed' ? 'green' : 'red'} fontSize="md" px={2} py={1}>
              {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
            </Badge>
          </HStack>
          
          {document.status === 'failed' && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              <Text>Processing failed: {document.error_message || 'Unknown error'}</Text>
            </Alert>
          )}
          
          {isProcessed ? (
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab><Box as={FiUser} mr={2} /> Personal Info</Tab>
                <Tab><Box as={FiBook} mr={2} /> Education</Tab>
                <Tab><Box as={FiBriefcase} mr={2} /> Work Experience</Tab>
                <Tab><Box as={FiTool} mr={2} /> Skills</Tab>
                <Tab><Box as={FiFolder} mr={2} /> Projects</Tab>
                <Tab><Box as={FiAward} mr={2} /> Certifications</Tab>
              </TabList>

              <TabPanels>
                {/* Personal Info Tab */}
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Stack spacing={4}>
                        <Heading size="md" mb={2}>Personal Information</Heading>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {document.parsed_data.personal_info.name && (
                            <HStack>
                              <Box as={FiUser} color="blue.500" />
                              <Text fontWeight="bold">Name:</Text>
                              <Text>{document.parsed_data.personal_info.name}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.email && (
                            <HStack>
                              <Box as={FiMail} color="blue.500" />
                              <Text fontWeight="bold">Email:</Text>
                              <Text>{document.parsed_data.personal_info.email}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.phone && (
                            <HStack>
                              <Box as={FiPhone} color="blue.500" />
                              <Text fontWeight="bold">Phone:</Text>
                              <Text>{document.parsed_data.personal_info.phone}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.location && (
                            <HStack>
                              <Box as={FiMapPin} color="blue.500" />
                              <Text fontWeight="bold">Location:</Text>
                              <Text>{document.parsed_data.personal_info.location}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.linkedin && (
                            <HStack>
                              <Box as={FiExternalLink} color="blue.500" />
                              <Text fontWeight="bold">LinkedIn:</Text>
                              <Text>{document.parsed_data.personal_info.linkedin}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.github && (
                            <HStack>
                              <Box as={FiExternalLink} color="blue.500" />
                              <Text fontWeight="bold">GitHub:</Text>
                              <Text>{document.parsed_data.personal_info.github}</Text>
                            </HStack>
                          )}
                          
                          {document.parsed_data.personal_info.website && (
                            <HStack>
                              <Box as={FiGlobe} color="blue.500" />
                              <Text fontWeight="bold">Website:</Text>
                              <Text>{document.parsed_data.personal_info.website}</Text>
                            </HStack>
                          )}
                        </SimpleGrid>
                      </Stack>
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Heading size="md" mb={4}>Education History</Heading>
                      
                      {document.parsed_data.education && document.parsed_data.education.length > 0 ? (
                        <Accordion allowMultiple defaultIndex={[0]}>
                          {document.parsed_data.education.map((edu, index) => (
                            <AccordionItem key={index}>
                              <h2>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left" fontWeight="medium">
                                    {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <VStack align="start" spacing={2}>
                                  <Text><strong>Institution:</strong> {edu.institution}</Text>
                                  
                                  {(edu.start_date || edu.end_date) && (
                                    <HStack>
                                      <Box as={FiCalendar} color="blue.500" />
                                      <Text>
                                        {edu.start_date ? formatDate(edu.start_date) : 'N/A'} - {edu.end_date ? formatDate(edu.end_date) : 'Present'}
                                      </Text>
                                    </HStack>
                                  )}
                                  
                                  {edu.gpa && <Text><strong>GPA:</strong> {edu.gpa}</Text>}
                                  
                                  {edu.description && (
                                    <Box>
                                      <Text fontWeight="medium">Description:</Text>
                                      <Text>{edu.description}</Text>
                                    </Box>
                                  )}
                                </VStack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Text color="gray.500">No education information found</Text>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Heading size="md" mb={4}>Work Experience</Heading>
                      
                      {document.parsed_data.work_experience && document.parsed_data.work_experience.length > 0 ? (
                        <Accordion allowMultiple defaultIndex={[0]}>
                          {document.parsed_data.work_experience.map((work, index) => (
                            <AccordionItem key={index}>
                              <h2>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left" fontWeight="medium">
                                    {work.position} at {work.company}
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <VStack align="start" spacing={2}>
                                  {work.location && <Text><strong>Location:</strong> {work.location}</Text>}
                                  
                                  {(work.start_date || work.end_date) && (
                                    <HStack>
                                      <Box as={FiCalendar} color="blue.500" />
                                      <Text>
                                        {work.start_date ? formatDate(work.start_date) : 'N/A'} - {work.end_date ? formatDate(work.end_date) : 'Present'}
                                      </Text>
                                    </HStack>
                                  )}
                                  
                                  {work.description && (
                                    <Box>
                                      <Text fontWeight="medium">Description:</Text>
                                      <Text>{work.description}</Text>
                                    </Box>
                                  )}
                                  
                                  {work.highlights && work.highlights.length > 0 && (
                                    <Box width="100%">
                                      <Text fontWeight="medium">Highlights:</Text>
                                      <List spacing={1} mt={1}>
                                        {work.highlights.map((highlight, idx) => (
                                          <ListItem key={idx}>
                                            <ListIcon as={FiCheckCircle} color="green.500" />
                                            {highlight}
                                          </ListItem>
                                        ))}
                                      </List>
                                    </Box>
                                  )}
                                </VStack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Text color="gray.500">No work experience information found</Text>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Heading size="md" mb={4}>Skills</Heading>
                      
                      {document.parsed_data.skills && document.parsed_data.skills.length > 0 ? (
                        <Box>
                          {(() => {
                            const skillsByCategory = {};
                            
                            // Group skills by category
                            document.parsed_data.skills.forEach(skill => {
                              const category = skill.category || 'Other';
                              if (!skillsByCategory[category]) {
                                skillsByCategory[category] = [];
                              }
                              skillsByCategory[category].push(skill);
                            });
                            
                            return Object.entries(skillsByCategory).map(([category, skills]) => (
                              <Box key={category} mb={4}>
                                <Heading size="sm" mb={2}>{category}</Heading>
                                <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={2}>
                                  {skills.map((skill, index) => (
                                    <Badge key={index} colorScheme="blue" p={2} borderRadius="md">
                                      {skill.name}
                                      {skill.level && ` (${skill.level})`}
                                    </Badge>
                                  ))}
                                </SimpleGrid>
                              </Box>
                            ));
                          })()}
                        </Box>
                      ) : (
                        <Text color="gray.500">No skills information found</Text>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Heading size="md" mb={4}>Projects</Heading>
                      
                      {document.parsed_data.projects && document.parsed_data.projects.length > 0 ? (
                        <Accordion allowMultiple defaultIndex={[0]}>
                          {document.parsed_data.projects.map((project, index) => (
                            <AccordionItem key={index}>
                              <h2>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left" fontWeight="medium">
                                    {project.name}
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <VStack align="start" spacing={2}>
                                  {(project.start_date || project.end_date) && (
                                    <HStack>
                                      <Box as={FiCalendar} color="blue.500" />
                                      <Text>
                                        {project.start_date ? formatDate(project.start_date) : 'N/A'} - {project.end_date ? formatDate(project.end_date) : 'Present'}
                                      </Text>
                                    </HStack>
                                  )}
                                  
                                  {project.description && (
                                    <Box>
                                      <Text fontWeight="medium">Description:</Text>
                                      <Text>{project.description}</Text>
                                    </Box>
                                  )}
                                  
                                  {project.technologies && project.technologies.length > 0 && (
                                    <Box>
                                      <Text fontWeight="medium">Technologies:</Text>
                                      <HStack flexWrap="wrap" spacing={2} mt={1}>
                                        {project.technologies.map((tech, idx) => (
                                          <Badge key={idx} colorScheme="purple">
                                            {tech}
                                          </Badge>
                                        ))}
                                      </HStack>
                                    </Box>
                                  )}
                                  
                                  {project.url && (
                                    <HStack>
                                      <Box as={FiExternalLink} color="blue.500" />
                                      <Text fontWeight="medium">URL:</Text>
                                      <Text>{project.url}</Text>
                                    </HStack>
                                  )}
                                </VStack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Text color="gray.500">No project information found</Text>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
                
                <TabPanel>
                  <Card>
                    <CardBody>
                      <Heading size="md" mb={4}>Certifications</Heading>
                      
                      {document.parsed_data.certifications && document.parsed_data.certifications.length > 0 ? (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          {document.parsed_data.certifications.map((cert, index) => (
                            <Card key={index} variant="outline">
                              <CardBody>
                                <VStack align="start" spacing={2}>
                                  <Heading size="sm">{cert.name}</Heading>
                                  
                                  {cert.issuer && (
                                    <Text>
                                      <strong>Issuer:</strong> {cert.issuer}
                                    </Text>
                                  )}
                                  
                                  {cert.date && (
                                    <HStack>
                                      <Box as={FiCalendar} color="blue.500" />
                                      <Text>
                                        Issued: {formatDate(cert.date)}
                                      </Text>
                                    </HStack>
                                  )}
                                  
                                  {cert.expiration_date && (
                                    <HStack>
                                      <Box as={FiCalendar} color="red.500" />
                                      <Text>
                                        Expires: {formatDate(cert.expiration_date)}
                                      </Text>
                                    </HStack>
                                  )}
                                  
                                  {cert.url && (
                                    <HStack>
                                      <Box as={FiExternalLink} color="blue.500" />
                                      <Text fontWeight="medium">URL:</Text>
                                      <Text>{cert.url}</Text>
                                    </HStack>
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </SimpleGrid>
                      ) : (
                        <Text color="gray.500">No certification information found</Text>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : (
            <Card>
              <CardBody>
                <VStack spacing={4} align="center" py={10}>
                  <Heading size="md">Document Details</Heading>
                  <Divider />
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
                    <HStack>
                      <Text fontWeight="bold">Filename:</Text>
                      <Text>{document.filename}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold">Upload Date:</Text>
                      <Text>{new Date(document.upload_date).toLocaleString()}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold">File Type:</Text>
                      <Text>{document.file_type.toUpperCase()}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold">File Size:</Text>
                      <Text>{(document.file_size / 1024).toFixed(2)} KB</Text>
                    </HStack>
                  </SimpleGrid>
                  
                  {document.status === 'pending' || document.status === 'processing' ? (
                    <Alert status="info" mt={4}>
                      <AlertIcon />
                      <Text>
                        This document is still being processed. Check back later to view the extracted information.
                      </Text>
                    </Alert>
                  ) : null}
                </VStack>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default DocumentView;