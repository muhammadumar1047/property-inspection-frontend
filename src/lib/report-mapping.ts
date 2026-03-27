import { ReportDto, InspectionResponse } from '@/types/api';

/**
 * Transforms the API ReportDto into the structure expected by the ReportViewer premium component.
 */
export function mapApiReportToViewer(dto: ReportDto) {
  const inspection = dto.inspection;
  
  // Extract agency info
  const agency = inspection?.agency;
  const agencyAddressParts = [
    agency?.address,
    agency?.suburb || agency?.city,
    agency?.state?.name,
    agency?.postcode
  ].filter(Boolean);

  // Extract property info
  const property = inspection?.property;
  const propertyState = property?.state?.name || inspection?.propertySubhurb || '';

  // Calculate image counter to provide unique stable IDs for the viewer's hash navigation
  let imageCounter = 0;

  const mappedAreas = (dto.reportAreas || []).map(area => {
    return {
      name: area.name,
      items: (area.reportItems || []).map(item => {
        // Find conditions. Backend typical descriptions: "Clean", "Undamaged", "Working", "Keys"
        const findCondition = (desc: string) => {
          const cond = item.reportItemConditions?.find(c => 
            c.description.toLowerCase() === desc.toLowerCase()
          );
          if (!cond || !cond.value) return null;
          return cond.value.toUpperCase() === 'Y' || cond.value.toUpperCase() === 'YES';
        };

        const itemImages = (item.reportMedia || []).map(media => {
          imageCounter++;
          return {
            id: imageCounter,
            url: media.url,
            comments: media.reportMediaComments?.map(c => c.text).join('; ') || ''
          };
        });

        return {
          name: item.name,
          clean: findCondition('Clean'),
          undamaged: findCondition('Undamaged'),
          working: findCondition('Working'),
          keys: findCondition('Keys'),
          comments: item.reportItemComments?.map(c => c.text).join('\n') || '',
          images: itemImages.map(img => img.id),
          mediaItems: itemImages // Extra field for actual image rendering
        };
      })
    };
  });

  return {
    id: dto.id || dto.inspectionId,
    agencyName: agency?.legalBusinessName || 'Agency Name',
    agencyAddress: agencyAddressParts.join(', '),
    agencyPhone: agency?.phoneNumber || '',
    inspectorName: inspection?.inspectorName || 'Inspector',
    reportTitle: dto.reportType || 'CONDITION REPORT',
    regulation: 'Residential Tenancy Regulation',
    jurisdiction: propertyState,
    leaseStartDate: inspection?.tenancySnapshots?.[0]?.leaseStartDate?.split('T')[0] || '',
    inspectionDate: inspection?.inspectionDate?.split('T')[0] || '',
    propertyAddress: inspection?.propertyAddress || '',
    tenantNames: inspection?.tenancySnapshots?.map(t => t.fullName) || [],
    summaryInfo: {
      communicationFacilities: [
        { label: "A telephone line is connected to the residential premises", value: null },
        { label: "An internet line is connected to the residential premises", value: null }
      ],
      waterEfficiency: {
        separatelyMetered: null,
        standards: [
          { label: "All showerheads have a maximum flow rate of 9 litres/min", value: null },
          { label: "All toilets are dual flush toilets with a minimum 3 star rating", value: null }
        ]
      },
      healthIssues: [
        { label: "Are there any signs of mould and dampness?", value: null },
        { label: "Are there any pests or vermin?", value: null }
      ]
    },
    areas: mappedAreas,
    signatures: {
      inspector: { 
        name: inspection?.inspectorName || '', 
        date: inspection?.inspectionDate?.split('T')[0] || '' 
      },
      tenant: { 
        name: inspection?.tenancySnapshots?.[0]?.fullName || 'Tenant', 
        date: inspection?.inspectionDate?.split('T')[0] || '' 
      }
    }
  };
}
