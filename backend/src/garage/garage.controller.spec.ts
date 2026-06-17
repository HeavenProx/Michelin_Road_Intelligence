import type { Request } from 'express';
import type { User } from '../users/user.entity';
import { GarageController } from './garage.controller';
import type { GarageService } from './garage.service';

const user = { id: 7 } as User;
const req = { user } as unknown as Request;

describe('GarageController', () => {
  it('GET /api/garage délègue à getGarage', async () => {
    const service = {
      getGarage: jest.fn().mockResolvedValue({ success: true, bikes: [] }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    const res = await controller.getGarage(req);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getGarage).toHaveBeenCalledWith(user);
    expect(res.success).toBe(true);
  });

  it("GET /api/garage/demo ne requiert pas d'utilisateur", () => {
    const service = {
      getDemoGarage: jest.fn().mockReturnValue({ success: true, bikes: [] }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    const res = controller.getDemo();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.getDemoGarage).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  it('PUT /api/garage/tyres délègue à setTyre', async () => {
    const dto = {
      bikeId: 1,
      position: 'FRONT' as const,
      modelGlobalId: 'g1',
      mountedDate: '2025-08-15',
    };
    const service = {
      setTyre: jest.fn().mockResolvedValue({ id: 5 }),
    } as unknown as GarageService;
    const controller = new GarageController(service);

    await controller.setTyre(req, dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.setTyre).toHaveBeenCalledWith(user, dto);
  });
});
