import api from './http';
import { StateDto, PropertyTypeDto, InspectionTypeDto, InspectionStatusDto, CountryDto, TimeZoneDto } from '@/types/api';

export const referenceApi = {
  // Countries
  getCountries: async (): Promise<CountryDto[]> => {
    const res = await api.get('/lookup/countries');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((c) => ({
      id: String(c.id ?? c.countryId ?? c.CountryId ?? ''),
      name: String(c.name ?? c.countryName ?? c.Name ?? ''),
      isoAlpha3: String(c.isoAlpha3 ?? c.isoCode ?? c.IsoCode ?? ''),
      isoAlpha2: String(c.isoAlpha2 ?? c.isoCode2 ?? c.IsoCode2 ?? ''),
    }));
  },

  getStates: async (): Promise<StateDto[]> => {
    const res = await api.get('/lookup/states');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((s) => {
      const id = s.id ?? s.stateId ?? s.StateId;
      const name = s.name ?? s.stateName ?? s.StateName;
      const countryId = s.countryId ?? s.CountryId;
      const country = s.country ?? s.Country;
      return { id, name, countryId, country } as StateDto;
    });
  },
  getStatesByCountry: async (countryId: string | number): Promise<StateDto[]> => {
    const res = await api.get(`/lookup/countries/${countryId}/states`);
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((s) => {
      const id = s.id ?? s.stateId ?? s.StateId;
      const name = s.name ?? s.stateName ?? s.StateName;
      const cId = s.countryId ?? s.CountryId ?? String(countryId);
      const country = s.country ?? s.Country;
      return { id, name, countryId: cId, country } as StateDto;
    });
  },
  // States by Agency for property form
  getStatesByAgency: async (agencyId: string | number): Promise<StateDto[]> => {
    const res = await api.get(`/lookup/agency-states/${agencyId}`);
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((s) => ({
      id: s.id ?? s.stateId ?? s.StateId,
      name: s.name ?? s.stateName ?? s.StateName,
      countryId: s.countryId ?? s.CountryId,
      country: s.country ?? s.Country,
    })) as StateDto[];
  },
  getPropertyTypes: async (): Promise<PropertyTypeDto[]> => {
    const res = await api.get('/lookup/propertytypes');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((p) => {
      const propertyTypeId = p.propertyTypeId ?? p.PropertyTypeId ?? p.id;
      const name = p.name ?? p.typeName ?? p.TypeName;
      const description = p.description ?? p.Description;
      return { propertyTypeId, name, description } as PropertyTypeDto;
    });
  },
  // Timezones
  getTimezonesByCountry: async (countryId: string | number): Promise<TimeZoneDto[]> => {
    const res = await api.get(`/lookup/countries/${countryId}/timezones`);
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((t) => ({
      id: t.id ?? t.timeZoneLookupId ?? t.TimeZoneLookupId,
      displayName: t.displayName ?? t.DisplayName,
      timeZoneId: t.timeZoneId ?? t.TimeZoneId,
      countryId: t.countryId ?? t.CountryId,
    }));
  },
  // Returns objects shaped like { id: number, name: string }
  getLayoutTypes: async (): Promise<Array<{ id: number; name: string }>> => {
    const res = await api.get('/lookup/layouttypes');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    const raw = Array.isArray(body) ? body : [];
    return raw.map((t) => ({ id: t.id ?? t.layoutTypeId ?? t.LayoutTypeId, name: t.name ?? t.layoutTypeName ?? t.LayoutTypeName }));
  },
  getInspectionTypes: async (): Promise<InspectionTypeDto[]> => {
    const res = await api.get('/lookup/inspection/types');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    return Array.isArray(body) ? body : [];
  },
  getInspectionStatuses: async (): Promise<InspectionStatusDto[]> => {
    const res = await api.get('/lookup/inspection/statuses');
    const body = res.data?.Data ?? res.data?.data ?? res.data;
    return Array.isArray(body) ? body : [];
  },
};

export default referenceApi;
