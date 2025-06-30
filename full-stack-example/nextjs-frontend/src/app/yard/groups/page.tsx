import React, { FC } from 'react';
import Header from '@/components/yard/header';
import GroupsComponent from '@/components/yard/GroupsComponents';

// Groups page component
const Groups: FC = () => {
  return (
    <div className="w-full h-screen">
      <Header />
      <GroupsComponent />
    </div>
);
};

export default Groups;
