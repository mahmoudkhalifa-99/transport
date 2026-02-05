
import { MasterData, TransportRecord, Release, FactoryBalance } from './types';

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxPhThkNdWNwqOg75pkHix6sx0etk-piwXTNglm5Y-cu9yUErS6mZYgB1fg4ix-ovjfhw/exec";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, backoff = 1000): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options);
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
    }
    throw error;
  }
}

export const transportService = {
  async getAllData(): Promise<{ transports: TransportRecord[], releases: Release[], factoryBalances: FactoryBalance[], masterData: MasterData }> {
    try {
      const response = await fetchWithRetry(`${GOOGLE_SHEETS_URL}?action=getAllData`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Server status: ${response.status}`);
      const result = await response.json();
      
      const rawMaster = result.masterData || {};
      const masterData: MasterData = {
        drivers: rawMaster.drivers || [],
        cars: rawMaster.cars || [],
        loadingSites: rawMaster.loadingSites || [],
        unloadingSites: rawMaster.unloadingSites || [],
        goodsTypes: rawMaster.goodsTypes || [],
        orderNumbers: rawMaster.orderNumbers || [],
        contractors: rawMaster.contractors || [],
        users: rawMaster.users || [],
        items: rawMaster.items || []
      };

      localStorage.setItem('records_cache', JSON.stringify(result.transports || []));
      localStorage.setItem('releases_cache', JSON.stringify(result.releases || []));
      localStorage.setItem('factoryBalances_cache', JSON.stringify(result.factoryBalances || []));
      localStorage.setItem('masterData_cache', JSON.stringify(masterData));

      return {
        transports: result.transports || [],
        releases: result.releases || [],
        factoryBalances: result.factoryBalances || [],
        masterData
      };
    } catch (error: any) {
      const cachedRecords = localStorage.getItem('records_cache');
      const cachedReleases = localStorage.getItem('releases_cache');
      const cachedFactory = localStorage.getItem('factoryBalances_cache');
      const cachedMaster = localStorage.getItem('masterData_cache');
      
      return {
        transports: cachedRecords ? JSON.parse(cachedRecords) : [],
        releases: cachedReleases ? JSON.parse(cachedReleases) : [],
        factoryBalances: cachedFactory ? JSON.parse(cachedFactory) : [],
        masterData: cachedMaster ? JSON.parse(cachedMaster) : { 
          drivers: [], cars: [], loadingSites: [], unloadingSites: [], 
          goodsTypes: [], orderNumbers: [], contractors: [], users: [], items: [] 
        }
      };
    }
  },

  async addRecord(record: TransportRecord): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addRecord', record })
    });
  },

  async updateRecord(record: TransportRecord): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateRecord', record })
    });
  },

  async deleteRecord(autoId: string, goodsType: string): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRecord', autoId, goodsType })
    });
  },

  async saveMasterData(data: MasterData): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'saveMasterData', data })
    });
  },

  async addReleasesBulk(header: any, distributions: any[]): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addReleasesBulk', header, distributions })
    });
  },

  async updateRelease(release: any): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateRelease', release })
    });
  },

  async deleteRelease(id: string, goodsType: string): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRelease', id, goodsType })
    });
  },

  async updateFactoryBalance(balance: FactoryBalance): Promise<void> {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateFactoryBalance', balance })
    });
  }
};
