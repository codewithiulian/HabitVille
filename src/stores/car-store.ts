import { create } from 'zustand';
import type { CityCar } from '@/db/db';
import { persistCar, persistCarDelete } from '@/db/city-persistence';

interface CarState {
  ownedCars: CityCar[];
  initialized: boolean;

  initFromRecords: (records: CityCar[]) => void;
  purchaseCar: (assetId: string) => string;   // returns record ID
  sellCar: (recordId: string) => void;
  getCountByAssetId: (assetId: string) => number;
}

export const useCarStore = create<CarState>((set, get) => ({
  ownedCars: [],
  initialized: false,

  initFromRecords: (records) => {
    set({ ownedCars: records, initialized: true });
  },

  purchaseCar: (assetId) => {
    const now = new Date().toISOString();
    const record: CityCar = {
      id: crypto.randomUUID(),
      assetId,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ ownedCars: [...s.ownedCars, record] }));
    persistCar(record);
    return record.id;
  },

  sellCar: (recordId) => {
    set((s) => ({
      ownedCars: s.ownedCars.filter((c) => c.id !== recordId),
    }));
    persistCarDelete(recordId);
  },

  getCountByAssetId: (assetId) => {
    return get().ownedCars.filter((c) => c.assetId === assetId).length;
  },
}));
