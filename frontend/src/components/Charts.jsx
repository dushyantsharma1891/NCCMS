import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const palette = ['#1c3566', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#0f2044', '#1d4ed8', '#38bdf8'];

export const BarChart = ({ labels, data, label = 'Count' }) => (
  <Bar
    data={{ labels, datasets: [{ label, data, backgroundColor: palette[0], borderRadius: 6 }] }}
    options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
  />
);

export const PieChart = ({ labels, data }) => (
  <Pie
    data={{ labels, datasets: [{ data, backgroundColor: palette }] }}
    options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
  />
);

export const LineChart = ({ labels, data, label = 'Complaints' }) => (
  <Line
    data={{
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: palette[1],
          backgroundColor: 'rgba(37,99,235,0.12)',
          fill: true,
          tension: 0.35,
        },
      ],
    }}
    options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
  />
);
