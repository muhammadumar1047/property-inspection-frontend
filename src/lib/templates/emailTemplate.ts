export const emailTemplate = (styles: any, data: any, bodyContent: string = '', logoUrl: string = '', signature: string = '') => {
  // Helper to replace placeholders in custom text
  const hydrate = (text: string) => {
    if (!text) return '';
    return text
      .replace(/{{ReportLink}}/g, data.reportLink || '#')
      .replace(/{{LandlordName}}/g, data.landlordName || 'Landlord')
      .replace(/{{PropertyAddress}}/g, data.propertyAddress || 'Address')
      .replace(/{{TenantName}}/g, data.tenantName || 'Tenant')
      .replace(/{{PropertyDetails}}/g, data.propertyDetails || 'Details')
      .replace(/{{LandlordDetails}}/g, data.landlordDetails || 'Landlord Details')
      .replace(/{{TenantDetails}}/g, data.tenantDetails || 'Tenant Details')
      .replace(/{{InspectionDetails}}/g, data.inspectionDetails || 'Inspection Details');
  };

  const defaultBody = `
    <h1 style="color: ${styles.primaryColor || '#003B73'}; margin-top: 0;">Property Inspection Report</h1>
    <p>Dear {{LandlordName}},</p>
    <p>An inspection has been completed for your property at {{PropertyAddress}}.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ReportLink}}" style="background-color: ${styles.secondaryColor || '#EF4444'}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Full Inspection Report</a>
    </div>
  `;

  const defaultSignature = `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      Best regards,<br>
      <strong>Property Inspection Agency</strong>
    </div>
  `;

  const finalBody = bodyContent || defaultBody;
  const finalSignature = signature || defaultSignature;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7f6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      padding: 30px;
    }
    .logo-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      max-height: 80px;
    }
    .dynamic-content {
      font-family: ${styles.fontFamily || 'Arial, sans-serif'};
      line-height: 1.6;
      color: #333333;
    }
    .signature {
      margin-top: 30px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        width: 100%;
        border-radius: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${logoUrl ? `
    <div class="logo-container">
      <img src="${logoUrl}" alt="Agency Logo" class="logo">
    </div>
    ` : ''}
    
    <div class="dynamic-content">
      ${hydrate(finalBody)}
    </div>

    <div class="signature">
      ${hydrate(finalSignature)}
    </div>
  </div>
</body>
</html>
`;
};
