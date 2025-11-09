import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { ScoreboardMetric } from '@/types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface MetricTrendChartProps {
  metrics: ScoreboardMetric[]
}

function MetricTrendChart({ metrics }: MetricTrendChartProps) {
  const data = {
    labels: metrics.map((m) => m.name),
    datasets: [
      {
        label: 'Current Value',
        data: metrics.map((m) => m.current_value),
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Target Value',
        data: metrics.map((m) => m.target_value),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
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
        text: 'Metrics Progress',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No metrics to display
      </div>
    )
  }

  return <Bar data={data} options={options} />
}

export default MetricTrendChart

