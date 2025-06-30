"use client"

import React from 'react';
import { useState } from 'react';
import { useSession } from "next-auth/react";
import { Loader2 } from 'lucide-react';
import { generateUUIDv7 } from '@/lib/apiFunctions';

const GroupsComponents = () => {
    const [isGroupCreateModalOpen, setIsGroupCreateModalOpen] = useState<boolean>(false);
    const [isGroupCreating, setIsGroupCreating] = useState<boolean>(false);
    const [groupName, setGroupName] = useState<string>('');
    
    const { data: session } = useSession();

    const handleCreateGroupSubmit = async () => {
        if (!groupName?.trim()) {
            alert('Please enter a group name');
            return;
        }
        const groupId = generateUUIDv7();
        try {     
            setIsGroupCreating(true);   
            const response = await fetch(
              `/api/create-group?groupName=${groupName}&groupId=${groupId}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': session?.csrfToken || '',
                },
              }
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create group');
            }
        
            const result = await response.json();
            alert(`Group ${groupName} created successfully!`);
        
            return result;
        } catch (error) {
            console.error('Error creating group:', error);
            // You might want to show an error message to the user here
            throw error;
        } finally {
            setIsGroupCreating(false);
            setIsGroupCreateModalOpen(false);
            setGroupName('');
        }
    };

    return (
        <div className="mt-6 flex justify-end gap-3">
            <button
                onClick={() => setIsGroupCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={handleCreateGroupSubmit}
                className="px-4 py-2 bg-[rgb(7,59,76)] text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
                {isGroupCreating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                    </>
                ) : (
                    'Create'
                )}
            </button>
        </div>
    );
};

export default GroupsComponents;
