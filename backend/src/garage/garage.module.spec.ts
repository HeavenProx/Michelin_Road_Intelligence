import { Bike } from './bike.entity';
import { GarageTyre } from './garage-tyre.entity';

describe('Entités garage', () => {
  it('instancie un Bike avec ses champs', () => {
    const bike = new Bike();
    bike.stravaGearId = 'b123';
    bike.name = 'Tarmac';
    expect(bike.stravaGearId).toBe('b123');
  });

  it('instancie un GarageTyre monté par défaut sémantique', () => {
    const tyre = new GarageTyre();
    tyre.position = 'REAR';
    tyre.status = 'MOUNTED';
    expect(tyre.position).toBe('REAR');
    expect(tyre.status).toBe('MOUNTED');
  });
});
