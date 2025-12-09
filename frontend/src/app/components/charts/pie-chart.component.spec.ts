import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PieChartComponent } from './pie-chart.component';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update chart data when input data changes', () => {
    const testData = [
      { label: 'Task A', value: 10 },
      { label: 'Task B', value: 20 },
      { label: 'Task C', value: 15 }
    ];

    component.data = testData;
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.labels).toEqual(['Task A', 'Task B', 'Task C']);
    expect(component.chartData.datasets[0].data).toEqual([10, 20, 15]);
  });

  it('should use custom colors when provided', () => {
    const testData = [
      { label: 'Task A', value: 10, color: '#FF0000' },
      { label: 'Task B', value: 20, color: '#00FF00' }
    ];

    component.data = testData;
    component.ngOnChanges({
      data: { currentValue: testData, previousValue: undefined, firstChange: true }
    });

    expect(component.chartData.datasets[0].backgroundColor).toEqual(['#FF0000', '#00FF00']);
  });

  it('should display title when provided', () => {
    component.title = 'Test Chart';
    component.ngOnChanges({
      title: { currentValue: 'Test Chart', previousValue: undefined, firstChange: true }
    });

    expect(component.chartOptions.plugins?.title?.display).toBe(true);
    expect(component.chartOptions.plugins?.title?.text).toBe('Test Chart');
  });

  it('should have correct chart type', () => {
    expect(component.chartType).toBe('pie');
  });
});