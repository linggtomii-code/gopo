// src/app/api/quiz/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

type Participant = {
    nama: string;
    nim: string;
    jurusan: string;
};

type Answer = {
    questionId: string;
    category: string;
    score: number;
};

type Result = {
    ormawaId: string;
    name: string;
    type: string;
    score: number;
    matchedSkills: string[];
};

export async function GET() {
    return NextResponse.json({
        message: "API route is working!",
        timestamp: new Date().toISOString()
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { participant, answers, results } = body as {
            participant: Participant;
            answers: Answer[];
            results: Result[];
        };

        // Validasi
        if (!participant?.nama || !participant?.nim || !participant?.jurusan) {
            return NextResponse.json(
                { message: "Data peserta tidak lengkap" },
                { status: 400 }
            );
        }

        if (!answers || answers.length === 0) {
            return NextResponse.json(
                { message: "Jawaban quiz tidak ditemukan" },
                { status: 400 }
            );
        }

        // Format data untuk Google Sheets
        const top1 = results[0] || null;
        const top2 = results[1] || null;
        const top3 = results[2] || null;

        const sheetData = {
            timestamp: new Date().toISOString(),
            nama: participant.nama,
            nim: participant.nim,
            jurusan: participant.jurusan,
            jawaban: JSON.stringify(answers),
            top1_nama: top1?.name || "",
            top1_score: top1?.score || 0,
            top2_nama: top2?.name || "",
            top2_score: top2?.score || 0,
            top3_nama: top3?.name || "",
            top3_score: top3?.score || 0,
        };

        // Kirim ke Google Sheets
        const googleSheetsWebhookUrl = "https://script.google.com/macros/s/AKfycbwmAUCsDwv4byHp2Hgvf5CwYBtUMyWnyH7ppl6fjO14APWCGrYSaEBKfUvgBDnFsCHm/exec";
        if (!googleSheetsWebhookUrl) {
            console.error("ERROR: GOOGLE_SHEETS_WEBHOOK_URL belum diatur di environment variables!");
            return NextResponse.json(
                { message: "Server tidak dikonfigurasi untuk menyimpan data (Webhook URL hilang)" },
                { status: 500 } // Ubah status jadi 500 agar kamu tahu ada masalah serius
            );
        }
        const response = await fetch(googleSheetsWebhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sheetData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { message: `Gagal menyimpan ke Google Sheets: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Data berhasil disimpan",
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: error instanceof Error ? error.message : "Terjadi kesalahan pada server"
            },
            { status: 500 }
        );
    }
}