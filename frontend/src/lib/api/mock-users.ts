import type { Role } from "@/lib/auth";

export type FirmUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  activeMatters: number;
  status: "active" | "invited" | "disabled";
  joinedAt: string;
};

export const MOCK_USERS: FirmUser[] = [
  {
    id: "usr_solicitor",
    name: "Eleanor Hayes",
    email: "e.hayes@hayeswhitman.co.uk",
    role: "solicitor",
    title: "Senior Solicitor — Commercial",
    activeMatters: 8,
    status: "active",
    joinedAt: "2022-04-11",
  },
  {
    id: "usr_solicitor_2",
    name: "Daniel Pryce",
    email: "d.pryce@hayeswhitman.co.uk",
    role: "solicitor",
    title: "Associate — Employment",
    activeMatters: 5,
    status: "active",
    joinedAt: "2023-09-02",
  },
  {
    id: "usr_solicitor_3",
    name: "Priya Raman",
    email: "p.raman@hayeswhitman.co.uk",
    role: "solicitor",
    title: "Partner — Real Estate",
    activeMatters: 11,
    status: "active",
    joinedAt: "2019-01-22",
  },
  {
    id: "usr_receiving",
    name: "James Okafor",
    email: "j.okafor@chambers-lincolns.co.uk",
    role: "receiving",
    title: "Barrister — Commercial Court",
    activeMatters: 4,
    status: "active",
    joinedAt: "2021-06-08",
  },
  {
    id: "usr_receiving_2",
    name: "Helena Vargas",
    email: "h.vargas@chambers-lincolns.co.uk",
    role: "receiving",
    title: "Barrister — Employment",
    activeMatters: 3,
    status: "active",
    joinedAt: "2022-11-15",
  },
  {
    id: "usr_admin",
    name: "Margot Lee",
    email: "m.lee@hayeswhitman.co.uk",
    role: "admin",
    title: "Firm administrator",
    activeMatters: 0,
    status: "active",
    joinedAt: "2020-03-30",
  },
  {
    id: "usr_invited",
    name: "Tomás Beltrán",
    email: "t.beltran@hayeswhitman.co.uk",
    role: "solicitor",
    title: "Trainee — Regulatory",
    activeMatters: 0,
    status: "invited",
    joinedAt: "2026-04-01",
  },
];
