import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantDetail } from './tenant-detail';

describe('TenantDetail', () => {
  let component: TenantDetail;
  let fixture: ComponentFixture<TenantDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
