import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

jest.mock('./uploads.service', () => ({
  UploadsService: class UploadsService {},
}));

const mockUploadsService = {
  deleteByPathOriginal: jest.fn(),
};

describe('UploadsController', () => {
  let controller: UploadsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UploadsController(
      mockUploadsService as unknown as UploadsService,
    );
    mockUploadsService.deleteByPathOriginal.mockResolvedValue({
      deleted: true,
    });
  });

  it('prosljeđuje autentifikovanog korisnika servisu za brisanje', async () => {
    const user = {
      sub: 'uploader-1',
      username: 'uploader',
      email: 'uploader@example.test',
      roles: ['STYLIST'],
    };

    await expect(
      controller.deleteByPathOriginal('avatars/profile-original.jpg', user),
    ).resolves.toEqual({ deleted: true });

    expect(mockUploadsService.deleteByPathOriginal).toHaveBeenCalledWith(
      'avatars/profile-original.jpg',
      user,
    );
  });
});
