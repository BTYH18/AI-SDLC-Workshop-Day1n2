import { holidayDB, initializeDb } from '../lib/db'

const SINGAPORE_HOLIDAYS = [
  // 2024
  { date: '2024-01-01', name: "New Year's Day" },
  { date: '2024-02-10', name: 'Chinese New Year' },
  { date: '2024-02-11', name: 'Second Day of Chinese New Year' },
  // Feb 11 falls on Sunday → Feb 12 is a substitute holiday
  { date: '2024-02-12', name: 'Chinese New Year (Day off)' },
  { date: '2024-03-29', name: 'Good Friday' },
  { date: '2024-04-10', name: 'Hari Raya Puasa' },
  { date: '2024-05-01', name: 'Labour Day' },
  { date: '2024-05-22', name: 'Vesak Day' },
  { date: '2024-06-17', name: 'Hari Raya Haji' },
  { date: '2024-08-09', name: 'National Day' },
  { date: '2024-10-31', name: 'Deepavali' },
  { date: '2024-12-25', name: 'Christmas Day' },

  // 2025
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Second Day of Chinese New Year' },
  // CNY 2025 falls on weekdays – no substitute needed
  { date: '2025-03-31', name: 'Hari Raya Puasa' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-07', name: 'Hari Raya Haji' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },

  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Second Day of Chinese New Year' },
  // CNY 2026 falls on weekdays – no substitute needed
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-31', name: 'Vesak Day' },
  // Vesak Day falls on Sunday → Jun 1 is a substitute holiday
  { date: '2026-06-01', name: 'Vesak Day (Day off)' },
  { date: '2026-08-09', name: 'National Day' },
  // National Day falls on Sunday → Aug 10 is a substitute holiday
  { date: '2026-08-10', name: 'National Day (Day off)' },
  { date: '2026-11-08', name: 'Deepavali' },
  // Deepavali falls on Sunday → Nov 9 is a substitute holiday
  { date: '2026-11-09', name: 'Deepavali (Day off)' },
  { date: '2026-12-25', name: 'Christmas Day' },
]

async function seedHolidays() {
  try {
    await initializeDb()

    // Clear existing holidays so re-seeding always uses current accurate dates
    await holidayDB.deleteAll()

    let addedCount = 0
    for (const holiday of SINGAPORE_HOLIDAYS) {
      await holidayDB.create(holiday.date, holiday.name)
      addedCount++
    }

    console.log(`✅ Seeded ${addedCount} holidays successfully`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed holidays:', error)
    process.exit(1)
  }
}

seedHolidays()
