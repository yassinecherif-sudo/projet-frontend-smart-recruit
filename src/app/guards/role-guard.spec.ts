import { TestBed } from '@angular/core/testing';

import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    const guard = TestBed.runInInjectionContext(() => roleGuard(['ADMIN']));
    expect(guard).toBeTruthy();
  });
});
