import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mock ERP Database...');

  // Reset Data Intentially
  await prisma.erpSalary.deleteMany();
  await prisma.erpEmployee.deleteMany();

  // Create HRD Employees
  const emp1 = await prisma.erpEmployee.create({
    data: {
      firstName: 'Budi',
      lastName: 'Santoso',
      divisionName: 'HRD',
      jobTitle: 'HR Manager',
      hireDate: new Date('2020-01-15'),
      salaries: {
        create: {
          baseSalary: 15000000,
          allowance: 2000000,
          effectiveDate: new Date('2024-01-01')
        }
      }
    }
  });

  const emp2 = await prisma.erpEmployee.create({
    data: {
      firstName: 'Siti',
      lastName: 'Aminah',
      divisionName: 'HRD',
      jobTitle: 'HR Specialist',
      hireDate: new Date('2022-03-10'),
      salaries: {
        create: {
          baseSalary: 8000000,
          allowance: 1000000,
          effectiveDate: new Date('2024-01-01')
        }
      }
    }
  });

  // Create IT Employees
  const emp3 = await prisma.erpEmployee.create({
    data: {
      firstName: 'Jhansen',
      lastName: 'Wilson',
      divisionName: 'IT',
      jobTitle: 'Lead Software Engineer',
      hireDate: new Date('2019-06-01'),
      salaries: {
        create: {
          baseSalary: 25000000,
          allowance: 3000000,
          effectiveDate: new Date('2024-01-01')
        }
      }
    }
  });
  
  const emp4 = await prisma.erpEmployee.create({
    data: {
      firstName: 'Rudi',
      lastName: 'Hartono',
      divisionName: 'IT',
      jobTitle: 'Data Analyst',
      hireDate: new Date('2021-08-20'),
      salaries: {
        create: {
          baseSalary: 12000000,
          allowance: 1500000,
          effectiveDate: new Date('2024-01-01')
        }
      }
    }
  });

  // Create Finance Employees
  const emp5 = await prisma.erpEmployee.create({
    data: {
      firstName: 'Linda',
      lastName: 'Kusuma',
      divisionName: 'FINANCE',
      jobTitle: 'Finance Director',
      hireDate: new Date('2018-11-05'),
      salaries: {
        create: {
          baseSalary: 35000000,
          allowance: 5000000,
          effectiveDate: new Date('2024-01-01')
        }
      }
    }
  });

  console.log('Seeding Mock ERP finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
