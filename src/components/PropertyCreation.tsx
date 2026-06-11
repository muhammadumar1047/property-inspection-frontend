'use client';

import React from "react";
import PropertyForm from "@/components/properties/PropertyForm";

interface PropertyCreationProps {
  onPropertyCreated?: () => void;
  propertyId?: string;
  onClose?: () => void;
}

/**
 * Thin wrapper around PropertyForm for embedded use within AdminDashboard.
 * Preserves the original prop interface for backward compatibility.
 */
const PropertyCreation: React.FC<PropertyCreationProps> = ({ onPropertyCreated, propertyId, onClose }) => {
  return (
    <PropertyForm
      mode="embedded"
      onSuccess={onPropertyCreated}
      propertyId={propertyId}
      onClose={onClose}
    />
  );
};

export default PropertyCreation;
