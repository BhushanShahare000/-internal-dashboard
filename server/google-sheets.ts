import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export class GoogleSheetsService {
    private sheets: any;
    private spreadsheetId: string | undefined;
    private projectCache: string[] = [];
    private lastProjectFetch: number = 0;
    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        try {
            if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                let credentials;
                try {
                    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
                    // Standardize private key formatting
                    if (credentials.private_key) {
                        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
                    }
                } catch (e) {
                    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format:', e);
                }

                if (credentials) {
                    const auth = new google.auth.GoogleAuth({
                        credentials,
                        scopes: SCOPES,
                    });
                    this.sheets = google.sheets({ version: 'v4', auth });
                    console.log(`Google Sheets service initialized successfully. Email: ${credentials.client_email}`);
                }
            }
            this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
            console.log(`Using Spreadsheet ID: ${this.spreadsheetId}`);
        } catch (error) {
            console.error('Failed to initialize Google Sheets service:', error);
        }
    }

    async getProjects(): Promise<string[]> {
        if (!this.sheets || !this.spreadsheetId) {
            console.warn('Google Sheets service not initialized or Spreadsheet ID missing');
            return [];
        }

        const now = Date.now();
        if (this.projectCache.length > 0 && (now - this.lastProjectFetch < this.CACHE_DURATION)) {
            return this.projectCache;
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sheet1!A:A',
            });
            const rows = response.data.values;
            if (!rows || rows.length === 0) return [];

            const names = rows
                .map((row: any[]) => row[0])
                .filter((name: string) => name && name !== 'Project Names');

            this.projectCache = names;
            this.lastProjectFetch = now;
            return names;
        } catch (error) {
            console.error('Error fetching projects from Google Sheets:', error);
            return this.projectCache; // Return stale cache if error
        }
    }

    async appendTimeEntry(entry: {
        id: number;
        userEmail: string;
        projectName: string;
        date: string;
        timeSpent: string | number;
        createdAt: Date;
    }) {
        if (!this.sheets || !this.spreadsheetId) return;
        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'TimeEntries!A:F',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        entry.id,
                        entry.userEmail,
                        entry.projectName,
                        entry.date,
                        entry.timeSpent,
                        entry.createdAt.toISOString()
                    ]],
                },
            });
        } catch (error) {
            console.error('Error appending time entry to Google Sheets:', error);
        }
    }
}

export const googleSheets = new GoogleSheetsService();
