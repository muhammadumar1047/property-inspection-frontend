export const MOCK_INSPECTION_REPORT = {
  id: "4123-30137-2223574-12110196",
  agencyName: "(INTEGRATION) PROPERTYTREE",
  agencyAddress: "140 William Street, Woolloomooloo VIC 2011",
  agencyPhone: "02 9264 6299",
  inspectorName: "Frank Lyons",
  reportTitle: "ENTRY CONDITION REPORT",
  regulation: "Residential Tenancy Regulation",
  jurisdiction: "New South Wales - 2010",
  leaseStartDate: "2021-09-16",
  inspectionDate: "2022-06-22",
  propertyAddress: "Building 4/5250 Old Louisville Road, Pooler NSW 31322",
  tenantNames: ["MFK"],
  summaryInfo: {
    communicationFacilities: [
      { label: "A telephone line is connected to the residential premises", value: null },
      { label: "An internet line is connected to the residential premises", value: null }
    ],
    waterEfficiency: {
      separatelyMetered: null,
      standards: [
        { label: "All showerheads have a maximum flow rate of 9 litres/min", value: null },
        { label: "All toilets are dual flush toilets with a minimum 3 star rating", value: null },
        { label: "All internal cold water taps and single mixer taps have a maximum flow rate of 9 litres/min", value: null },
        { label: "The premises have been checked and any leaking taps or toilets fixed", value: null }
      ]
    },
    healthIssues: [
      { label: "Are there any signs of mould and dampness?", value: null },
      { label: "Are there any pests or vermin?", value: null },
      { label: "Has any rubbish been left on the premises?", value: null }
    ]
  },
  areas: [
    {
      name: "Entrance Hall",
      items: [
        { name: "Skirting", clean: true, undamaged: true, working: true, keys: true, comments: "1.MM: xnt", images: [1, 2, 3, 4, 5], tenantAgrees: false, tenantComments: "Refer to image: 7" },
        { name: "Floor", clean: true, undamaged: false, working: true, keys: true, tenantAgrees: true },
        { name: "Walls", clean: true, undamaged: true, working: true, keys: true, tenantAgrees: true }
      ]
    },
    {
      name: "Lounge Room",
      items: [
        { name: "Ceiling", clean: true, undamaged: true, working: true, keys: true, tenantAgrees: true },
        { name: "Lights/ Fixtures", clean: true, undamaged: true, working: true, keys: true, tenantAgrees: true },
        { name: "Blinds/ Curtains", clean: true, undamaged: true, working: true, keys: true, tenantAgrees: true }
      ]
    }
  ],
  signatures: {
    inspector: { name: "Frank Lyons", date: "2022-06-22" },
    tenant: { name: "MFK MFK", date: "2022-06-22" }
  }
};
