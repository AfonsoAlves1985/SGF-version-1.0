import nodemailer from "nodemailer";

type SendInvitationEmailParams = {
  to: string;
  name?: string;
  role: string;
  invitationLink: string;
  expiresAt: Date;
  invitedByName?: string;
};

type EmailResult = {
  sent: boolean;
  error?: string;
};

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "0");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<EmailResult> {
  const smtpTransport = getTransporter();
  if (!smtpTransport) {
    return {
      sent: false,
      error: "SMTP não configurado",
    };
  }

  const from = process.env.SMTP_FROM || "SGF <no-reply@sgf-grupo-frz.local>";
  const displayName = params.name?.trim() || "usuário";
  const inviterName = params.invitedByName?.trim() || "owner";
  const expiresAt = params.expiresAt.toLocaleString("pt-BR");

  try {
    await smtpTransport.sendMail({
      from,
      to: params.to,
      subject: "Convite de acesso ao SGF",
      text: `Olá, ${displayName}!\n\n${inviterName} convidou você para acessar o SGF com permissão ${params.role}.\n\nAtive seu acesso neste link:\n${params.invitationLink}\n\nValidade do convite: ${expiresAt}.\n\nEquipe SGF`,
      html: `
        <p>Olá, <strong>${displayName}</strong>!</p>
        <p>${inviterName} convidou você para acessar o <strong>SGF</strong> com permissão <strong>${params.role}</strong>.</p>
        <p>
          <a href="${params.invitationLink}" target="_blank" rel="noreferrer">Ativar acesso</a>
        </p>
        <p>Validade do convite: <strong>${expiresAt}</strong>.</p>
        <p>Equipe SGF</p>
      `,
    });

    return { sent: true };
  } catch (error) {
    console.error("[Mail] Falha ao enviar convite:", error);
    return {
      sent: false,
      error: "Falha no envio de e-mail",
    };
  }
}
