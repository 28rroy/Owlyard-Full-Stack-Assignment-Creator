'use client';

import React, { createContext, useContext, useState } from 'react';

interface UserContextType {
  userId: string;
  setUserId: (id: string) => void;
  isTeacher: boolean;
  setIsTeacher: (teacher: boolean) => void;
  assignmentOwnerId: string;
  setAssignmentOwnerId: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState('teacher-123'); // Default teacher ID
  const [isTeacher, setIsTeacher] = useState(true);
  const [assignmentOwnerId, setAssignmentOwnerId] = useState('teacher-123'); // Default owner ID

  return (
    <UserContext.Provider value={{ 
      userId, 
      setUserId, 
      isTeacher, 
      setIsTeacher,
      assignmentOwnerId,
      setAssignmentOwnerId
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};