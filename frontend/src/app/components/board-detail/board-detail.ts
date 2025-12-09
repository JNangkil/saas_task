import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DynamicTaskTableComponent } from '../task-table/dynamic-task-table.component';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [CommonModule, DynamicTaskTableComponent],
  templateUrl: './board-detail.html',
  styleUrl: './board-detail.css',
})
export class BoardDetail implements OnInit {
  boardId: number | undefined;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('boardId');
      if (id) {
        this.boardId = parseInt(id, 10);
      }
    });
  }
}
