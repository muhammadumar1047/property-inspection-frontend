import React from 'react';
import { emailTemplate } from '@/lib/templates/emailTemplate';

interface EmailTemplatePreviewProps {
  styles: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  content?: string;
  logoUrl?: string;
  signature?: string;
  data: {
    reportLink: string;
    landlordName: string;
    propertyAddress: string;
    tenantName: string;
    propertyDetails: string;
    landlordDetails: string;
    tenantDetails: string;
    inspectionDetails: string;
  };
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({ styles, content, logoUrl, signature, data }) => {
  const html = emailTemplate(styles, data, content, logoUrl, signature);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-gray-100 p-4 w-full h-full max-h-[80vh] overflow-y-auto">
      <div className="bg-white mx-auto max-w-2xl shadow-lg rounded-lg overflow-hidden">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <div className="mt-4 text-center text-xs text-gray-500 uppercase tracking-widest font-semibold flex-shrink-0">
        Email Preview
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
