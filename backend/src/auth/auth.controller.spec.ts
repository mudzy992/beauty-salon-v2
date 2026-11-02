jest.mock('./auth.service', () => ({ AuthService: class AuthService {} }));
jest.mock('../uploads/uploads.service', () => ({
  UploadsService: class UploadsService {},
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UploadsService } from '../uploads/uploads.service';
import type { RegisterDto } from './dto/register.dto';

describe('AuthController registration avatar lifecycle', () => {
  const dto: RegisterDto = {
    username: 'new-client',
    email: 'new-client@example.com',
    password: 'a-long-password',
    firstName: 'New',
    lastName: 'Client',
  };
  const avatar = {
    originalname: 'avatar.png',
    mimetype: 'image/png',
    buffer: Buffer.from('test-image'),
  } as Express.Multer.File;
  const uploaded = {
    id: 'upload-1',
    pathOriginal: 'private/avatars/avatar.webp',
    pathThumb: 'private/avatars/avatar-thumb.webp',
  };
  let auth: { register: jest.Mock };
  let uploads: {
    saveFile: jest.Mock;
    deleteUnreferencedUpload: jest.Mock;
  };
  let controller: AuthController;

  beforeEach(() => {
    auth = { register: jest.fn() };
    uploads = {
      saveFile: jest.fn().mockResolvedValue(uploaded),
      deleteUnreferencedUpload: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AuthController(
      auth as unknown as AuthService,
      uploads as unknown as UploadsService,
    );
  });

  it('removes a newly uploaded avatar when account registration fails', async () => {
    const registrationError = new Error('registration failed');
    auth.register.mockRejectedValue(registrationError);

    await expect(controller.register(dto, avatar)).rejects.toBe(
      registrationError,
    );

    expect(uploads.saveFile).toHaveBeenCalledWith(avatar, 'avatars');
    expect(auth.register).toHaveBeenCalledWith({
      ...dto,
      avatar: uploaded.pathThumb,
    });
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith(uploaded.id);
  });

  it('does not delete an avatar after successful registration', async () => {
    auth.register.mockResolvedValue({ access_token: 'token' });

    await expect(controller.register(dto, avatar)).resolves.toEqual({
      access_token: 'token',
    });

    expect(uploads.deleteUnreferencedUpload).not.toHaveBeenCalled();
  });

  it('preserves the registration error if best-effort avatar cleanup fails', async () => {
    const registrationError = new Error('registration failed');
    auth.register.mockRejectedValue(registrationError);
    uploads.deleteUnreferencedUpload.mockRejectedValue(
      new Error('cleanup failed'),
    );

    await expect(controller.register(dto, avatar)).rejects.toBe(
      registrationError,
    );
  });
});
