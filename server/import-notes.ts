import { readFileSync } from 'fs';
import { FirestoreStorage } from './storage';

async function importNotes() {
  const storage = new FirestoreStorage();
  
  // Read the CSV file
  const csvContent = readFileSync('c:/Kindling-Portal/attached_assets/Notes-Notes_(Main)_1765678559068.csv', 'utf-8');
  
  // Simple CSV parsing
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  console.log(`Found ${lines.length - 1} potential notes to import`);
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Basic CSV split (doesn't handle commas in quotes perfectly but good enough)
      const values = line.split(',');
      
      const noteId = values[0]?.trim();
      if (!noteId || noteId === '#ERROR!') {
        console.log(`Skipping line ${i}: No Note ID`);
        continue;
      }
      
      // Parse dates
      const parseDate = (dateStr: string) => {
        if (!dateStr || dateStr === '#ERROR!' || dateStr === 'NaN') return undefined;
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
        } catch {
          return undefined;
        }
      };
      
      // Parse currency
      const parseCurrency = (value: string) => {
        if (!value || value === 'NaN') return '0';
        return value.replace(/[\$,]/g, '').trim();
      };
      
      // Parse percentage
      const parsePercentage = (value: string) => {
        if (!value || value === 'NaN') return '0';
        return value.replace('%', '').trim();
      };
      
      // Parse number
      const parseNumber = (value: string) => {
        if (!value || value === 'NaN' || value.trim() === '') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      };
      
      const companyName = values[2]?.trim() || 'Unknown';
      const projectType = values[3]?.trim() || 'Bridge Loan';
      const loanAmount = parseCurrency(values[7]);
      const status = values[12]?.trim();
      
      const noteData = {
        noteId: noteId,
        borrower: 'Zv87aipa5lB2e0LTJSCR', // Crossroads Business Consulting ID
        title: `${companyName} - ${projectType}`,
        principal: loanAmount,
        rate: parsePercentage(values[8]),
        termMonths: parseNumber(values[9]),
        termYears: parseNumber(values[10]),
        projectType: projectType,
        loanPaymentStatus: 'Current',
        contractDate: parseDate(values[4]),
        paymentStartDate: parseDate(values[5]),
        maturityDate: parseDate(values[6]),
        fundingStartDate: parseDate(values[13]),
        fundingEndDate: parseDate(values[14]),
        fundingWindowEnd: values[15]?.trim() || undefined,
        firstPaymentDate: values[16]?.trim() || undefined,
        monthlyPayment: parseCurrency(values[11]),
        status: status === 'Active' ? 'Active' : status === 'Funding' ? 'Funding' : 'Active',
        clientStatus: status === 'Active' ? 'Active' : status === 'Funding' ? 'Funding in Progress' : 'Available',
        type: projectType,
        interestType: 'Amortized',
        description: values[18]?.trim() || '',
      };
      
      // Check if note already exists
      const existingNotes = await storage.getNotes();
      const exists = existingNotes.some((n: any) => n.noteId === noteData.noteId);
      
      if (exists) {
        console.log(`Note ${noteData.noteId} already exists, skipping...`);
        continue;
      }
      
      await storage.createNote(noteData as any);
      console.log(`✓ Imported note: ${noteData.noteId} - ${noteData.title} - ${noteData.status}`);
    } catch (error) {
      console.error(`Error importing line ${i}:`, error);
    }
  }
  
  console.log('\nImport complete!');
  process.exit(0);
}

importNotes().catch(console.error);
