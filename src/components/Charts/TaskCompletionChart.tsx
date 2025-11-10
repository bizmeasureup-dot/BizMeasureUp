import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface TaskCompletionChartProps {
  taskStats: {
    total: number
    completed: number
    pending: number
    rescheduling: number
    notApplicable: number
  }
}

function TaskCompletionChart({ taskStats }: TaskCompletionChartProps) {
  const data = {
    labels: ['Total', 'Completed', 'Pending', 'Rescheduling', 'Not Applicable'],
    datasets: [
      {
        label: 'Tasks',
        data: [taskStats.total, taskStats.completed, taskStats.pending, taskStats.rescheduling, taskStats.notApplicable],
        backgroundColor: [
          'rgba(99, 102, 241, 0.2)',
          'rgba(34, 197, 94, 0.2)',
          'rgba(234, 179, 8, 0.2)',
          'rgba(59, 130, 246, 0.2)',
          'rgba(107, 114, 128, 0.2)',
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Task Status Distribution',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return <Line data={data} options={options} />
}

export default TaskCompletionChart

