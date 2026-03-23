import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBoardModal } from './create-board-modal';

describe('CreateBoardModal', () => {
  let component: CreateBoardModal;
  let fixture: ComponentFixture<CreateBoardModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBoardModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBoardModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
