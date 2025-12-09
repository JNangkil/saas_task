import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoardSettings } from './board-settings';

describe('BoardSettings', () => {
  let component: BoardSettings;
  let fixture: ComponentFixture<BoardSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoardSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
