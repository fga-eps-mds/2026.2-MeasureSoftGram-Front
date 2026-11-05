'use client';

import React from 'react';
import { Box } from '@mui/material';
import { LandingHeader } from './components/LandingHeader';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { ValuePropsSection } from './components/ValuePropsSection';
import { IntegrationsSection } from './components/IntegrationsSection';
import { PublicationsSection } from './components/PublicationsSection';
import { CommunitySection } from './components/CommunitySection';
import { LandingFooter } from './components/LandingFooter';

const Landing: React.FC = () => {
  return (
    <Box component="main" sx={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <LandingHeader />
      <HeroSection />
      <HowItWorksSection />
      <ValuePropsSection />
      <IntegrationsSection />
      <PublicationsSection />
      <CommunitySection />
      <LandingFooter />
    </Box>
  );
};

export default Landing;
