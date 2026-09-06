"use client";

import { useState, useEffect } from "react";
import FranchiseTeamStatsSummary from "@/components/FranchiseTeamStatsSummary";
import FranchiseSchedule from "@/components/FranchiseSchedule";
import FranchiseRoster from "@/components/FranchiseRoster";

type Props = {
  teamId: string;
  temporada: number;
  onBack: () => void;
  section: "home" | "plantilla";
  onSectionChange: (section: "home" | "plantilla") => void;
  rosterTab: "ofensiva" | "defensiva" | "especiales" | "lesionados";
  onRosterTabChange: (
    tab: "ofensiva" | "defensiva" | "especiales" | "lesionados",
  ) => void;
};

const NFC_WEST = [
  {
    nombre: "Seattle Seahawks",
    abrev: "SEA",
    g: "14",
    p: "3",
    e: "0",
    pct: ".824",
    pf: "483",
    pc: "292",
    dif: "+191",
  },
  {
    nombre: "Los Angeles Rams",
    abrev: "LAR",
    g: "12",
    p: "5",
    e: "0",
    pct: ".706",
    pf: "518",
    pc: "386",
    dif: "+132",
  },
  {
    nombre: "San Francisco 49ers",
    abrev: "SF",
    g: "12",
    p: "5",
    e: "0",
    pct: ".706",
    pf: "437",
    pc: "363",
    dif: "+74",
  },
  {
    nombre: "Arizona Cardinals",
    abrev: "ARI",
    g: "3",
    p: "14",
    e: "0",
    pct: ".176",
    pf: "355",
    pc: "492",
    dif: "-137",
  },
];

const NFC_SOUTH = [
  {
    nombre: "Carolina Panthers",
    abrev: "CAR",
    g: "8",
    p: "9",
    e: "0",
    pct: ".471",
    pf: "311",
    pc: "362",
    dif: "-51",
  },
  {
    nombre: "Tampa Bay Buccaneers",
    abrev: "TB",
    g: "8",
    p: "9",
    e: "0",
    pct: ".471",
    pf: "354",
    pc: "381",
    dif: "-27",
  },
  {
    nombre: "Atlanta Falcons",
    abrev: "ATL",
    g: "8",
    p: "9",
    e: "0",
    pct: ".471",
    pf: "348",
    pc: "378",
    dif: "-30",
  },
  {
    nombre: "New Orleans Saints",
    abrev: "NO",
    g: "6",
    p: "11",
    e: "0",
    pct: ".353",
    pf: "310",
    pc: "382",
    dif: "-72",
  },
];

const NFC_NORTH = [
  {
    nombre: "Chicago Bears",
    abrev: "CHI",
    g: "11",
    p: "6",
    e: "0",
    pct: ".647",
    pf: "441",
    pc: "413",
    dif: "+28",
  },
  {
    nombre: "Green Bay Packers",
    abrev: "GB",
    g: "9",
    p: "7",
    e: "1",
    pct: ".559",
    pf: "391",
    pc: "352",
    dif: "+39",
  },
  {
    nombre: "Minnesota Vikings",
    abrev: "MIN",
    g: "9",
    p: "8",
    e: "0",
    pct: ".529",
    pf: "342",
    pc: "333",
    dif: "+9",
  },
  {
    nombre: "Detroit Lions",
    abrev: "DET",
    g: "9",
    p: "8",
    e: "0",
    pct: ".529",
    pf: "499",
    pc: "441",
    dif: "+58",
  },
];

const NFC_EAST = [
  {
    nombre: "Philadelphia Eagles",
    abrev: "PHI",
    g: "11",
    p: "6",
    e: "0",
    pct: ".647",
    pf: "379",
    pc: "325",
    dif: "+54",
  },
  {
    nombre: "Dallas Cowboys",
    abrev: "DAL",
    g: "7",
    p: "9",
    e: "1",
    pct: ".441",
    pf: "471",
    pc: "511",
    dif: "-40",
  },
  {
    nombre: "Washington Commanders",
    abrev: "WSH",
    g: "5",
    p: "12",
    e: "0",
    pct: ".294",
    pf: "356",
    pc: "451",
    dif: "-95",
  },
  {
    nombre: "New York Giants",
    abrev: "NYG",
    g: "4",
    p: "13",
    e: "0",
    pct: ".235",
    pf: "381",
    pc: "439",
    dif: "-58",
  },
];

const AFC_SOUTH = [
  {
    nombre: "Jacksonville Jaguars",
    abrev: "JAX",
    g: "13",
    p: "4",
    e: "0",
    pct: ".765",
    pf: "474",
    pc: "336",
    dif: "+138",
  },
  {
    nombre: "Houston Texans",
    abrev: "HOU",
    g: "12",
    p: "5",
    e: "0",
    pct: ".706",
    pf: "404",
    pc: "295",
    dif: "+109",
  },
  {
    nombre: "Indianapolis Colts",
    abrev: "IND",
    g: "8",
    p: "9",
    e: "0",
    pct: ".471",
    pf: "466",
    pc: "412",
    dif: "+54",
  },
  {
    nombre: "Tennessee Titans",
    abrev: "TEN",
    g: "3",
    p: "14",
    e: "0",
    pct: ".176",
    pf: "284",
    pc: "478",
    dif: "-194",
  },
];

const AFC_NORTH = [
  {
    nombre: "Pittsburgh Steelers",
    abrev: "PIT",
    g: "10",
    p: "7",
    e: "0",
    pct: ".588",
    pf: "397",
    pc: "387",
    dif: "+10",
  },
  {
    nombre: "Baltimore Ravens",
    abrev: "BAL",
    g: "8",
    p: "9",
    e: "0",
    pct: ".471",
    pf: "424",
    pc: "398",
    dif: "+26",
  },
  {
    nombre: "Cincinnati Bengals",
    abrev: "CIN",
    g: "6",
    p: "11",
    e: "0",
    pct: ".353",
    pf: "414",
    pc: "492",
    dif: "-78",
  },
  {
    nombre: "Cleveland Browns",
    abrev: "CLE",
    g: "5",
    p: "12",
    e: "0",
    pct: ".294",
    pf: "279",
    pc: "379",
    dif: "-100",
  },
];

const AFC_EAST = [
  {
    nombre: "New England Patriots",
    abrev: "NE",
    g: "14",
    p: "3",
    e: "0",
    pct: ".824",
    pf: "490",
    pc: "320",
    dif: "+170",
  },
  {
    nombre: "Buffalo Bills",
    abrev: "BUF",
    g: "12",
    p: "5",
    e: "0",
    pct: ".706",
    pf: "481",
    pc: "365",
    dif: "+116",
  },
  {
    nombre: "Miami Dolphins",
    abrev: "MIA",
    g: "7",
    p: "10",
    e: "0",
    pct: ".412",
    pf: "347",
    pc: "424",
    dif: "-77",
  },
  {
    nombre: "New York Jets",
    abrev: "NYJ",
    g: "3",
    p: "14",
    e: "0",
    pct: ".176",
    pf: "300",
    pc: "503",
    dif: "-203",
  },
];

const AFC_WEST = [
  {
    nombre: "Denver Broncos",
    abrev: "DEN",
    g: "14",
    p: "3",
    e: "0",
    pct: ".824",
    pf: "401",
    pc: "311",
    dif: "+90",
  },
  {
    nombre: "Los Angeles Chargers",
    abrev: "LAC",
    g: "11",
    p: "6",
    e: "0",
    pct: ".647",
    pf: "368",
    pc: "340",
    dif: "+28",
  },
  {
    nombre: "Kansas City Chiefs",
    abrev: "KC",
    g: "6",
    p: "11",
    e: "0",
    pct: ".353",
    pf: "362",
    pc: "328",
    dif: "+34",
  },
  {
    nombre: "Las Vegas Raiders",
    abrev: "LV",
    g: "3",
    p: "14",
    e: "0",
    pct: ".176",
    pf: "241",
    pc: "432",
    dif: "-191",
  },
];

type DivisionStandingHome = {
  nombre: string;
  abrev: string;
  g: string;
  p: string;
  e: string;
  pct: string;
  pf: string;
  pc: string;
  dif: string;
};

type EspnStandingHome = {
  nombre: string;
  equipo: string;
  conferencia: "AFC" | "NFC" | "";
  division: string;
  G: string;
  P: string;
  E: string;
  PCT: string;
  PA: string;
  PC: string;
};

type FranchiseHomeData = {
  info: [string, string][];
  palmares: {
    numero: string;
    titulo: string;
    detalle: string;
  }[];
};

const NFC_WEST_HOME: Record<string, FranchiseHomeData> = {
  SEA: {
    info: [
      ["Origen", "Franquicia de expansión fundada en 1976"],
      ["Estadio", "Lumen Field"],
      ["Ciudad", "Seattle, Washington"],
    ],
    palmares: [
      {
        numero: "1",
        titulo: "Super Bowl",
        detalle: "XLVIII",
      },
      {
        numero: "3",
        titulo: "Títulos NFC",
        detalle: "2005 · 2013 · 2014",
      },
    ],
  },

  LAR: {
    info: [
      ["Origen", "Cleveland Rams en 1936 · Los Angeles desde 1946"],
      ["Estadio", "SoFi Stadium"],
      ["Ciudad", "Los Angeles, California"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "XXXIV · LVI",
      },
      {
        numero: "4",
        titulo: "Campeonatos NFL",
        detalle: "1945 · 1951 · XXXIV · LVI",
      },
    ],
  },

  SF: {
    info: [
      ["Fundador", "Tony Morabito en 1946"],
      ["Estadio", "Levi's Stadium"],
      ["Ciudad", "San Francisco / Santa Clara, California"],
    ],
    palmares: [
      {
        numero: "5",
        titulo: "Super Bowls",
        detalle: "XVI · XIX · XXIII · XXIV · XXIX",
      },
      {
        numero: "8",
        titulo: "Títulos NFC",
        detalle: "1981 · 1984 · 1988 · 1989 · 1994 · 2012 · 2019 · 2023",
      },
    ],
  },

  ARI: {
    info: [
      ["Origen", "Franquicia fundada en Chicago en 1898"],
      ["Estadio", "State Farm Stadium"],
      ["Ciudad", "Phoenix / Glendale, Arizona"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XLIII",
      },
      {
        numero: "2",
        titulo: "Campeonatos NFL",
        detalle: "1925 · 1947",
      },
    ],
  },
};

const NFC_SOUTH_HOME: Record<string, FranchiseHomeData> = {
  TB: {
    info: [
      ["Origen", "Franquicia de expansión fundada en 1976"],
      ["Estadio", "Raymond James Stadium"],
      ["Ciudad", "Tampa, Florida"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "XXXVII · LV",
      },
      {
        numero: "2",
        titulo: "Títulos NFC",
        detalle: "2002 · 2020",
      },
    ],
  },

  CAR: {
    info: [
      ["Fundador", "Jerry Richardson · franquicia concedida en 1993"],
      ["Estadio", "Bank of America Stadium"],
      ["Ciudad", "Charlotte, North Carolina"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XXXVIII · 50",
      },
      {
        numero: "2",
        titulo: "Títulos NFC",
        detalle: "2003 · 2015",
      },
    ],
  },

  ATL: {
    info: [
      ["Origen", "Franquicia de expansión fundada en 1965"],
      ["Estadio", "Mercedes-Benz Stadium"],
      ["Ciudad", "Atlanta, Georgia"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XXXIII · LI",
      },
      {
        numero: "2",
        titulo: "Títulos NFC",
        detalle: "1998 · 2016",
      },
    ],
  },

  NO: {
    info: [
      ["Origen", "Franquicia fundada en 1966"],
      ["Estadio", "Caesars Superdome"],
      ["Ciudad", "New Orleans, Louisiana"],
    ],
    palmares: [
      {
        numero: "1",
        titulo: "Super Bowl",
        detalle: "XLIV",
      },
      {
        numero: "1",
        titulo: "Título NFC",
        detalle: "2009",
      },
    ],
  },
};

const NFC_NORTH_HOME: Record<string, FranchiseHomeData> = {
  CHI: {
    info: [
      ["Fundador", "George Halas en 1920"],
      ["Estadio", "Soldier Field"],
      ["Ciudad", "Chicago, Illinois"],
    ],
    palmares: [
      {
        numero: "1",
        titulo: "Super Bowl",
        detalle: "XX",
      },
      {
        numero: "9",
        titulo: "Campeonatos NFL",
        detalle: "1921 · 1932 · 1933 · 1940 · 1941 · 1943 · 1946 · 1963 · XX",
      },
    ],
  },

  GB: {
    info: [
      ["Fundadores", "Earl Curly Lambeau y George Calhoun en 1919"],
      ["Estadio", "Lambeau Field"],
      ["Ciudad", "Green Bay, Wisconsin"],
    ],
    palmares: [
      {
        numero: "4",
        titulo: "Super Bowls",
        detalle: "I · II · XXXI · XLV",
      },
      {
        numero: "13",
        titulo: "Campeonatos NFL",
        detalle: "Récord histórico de la NFL",
      },
    ],
  },

  MIN: {
    info: [
      ["Origen", "Franquicia de expansión fundada en 1960"],
      ["Estadio", "U.S. Bank Stadium"],
      ["Ciudad", "Minneapolis, Minnesota"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista IV · VIII · IX · XI",
      },
      {
        numero: "4",
        titulo: "Títulos NFC/NFL",
        detalle: "1969 · 1973 · 1974 · 1976",
      },
    ],
  },

  DET: {
    info: [
      ["Origen", "Portsmouth Spartans en 1930 · Detroit desde 1934"],
      ["Estadio", "Ford Field"],
      ["Ciudad", "Detroit, Michigan"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Sin apariciones",
      },
      {
        numero: "4",
        titulo: "Campeonatos NFL",
        detalle: "1935 · 1952 · 1953 · 1957",
      },
    ],
  },
};

const NFC_EAST_HOME: Record<string, FranchiseHomeData> = {
  PHI: {
    info: [
      ["Origen", "Franquicia establecida en Philadelphia en 1933"],
      ["Estadio", "Lincoln Financial Field"],
      ["Ciudad", "Philadelphia, Pennsylvania"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "LII · LIX",
      },
      {
        numero: "5",
        titulo: "Títulos NFC",
        detalle: "1980 · 2004 · 2017 · 2022 · 2024",
      },
    ],
  },

  DAL: {
    info: [
      ["Fundador", "Clint Murchison Jr. en 1960"],
      ["Estadio", "AT&T Stadium"],
      ["Ciudad", "Dallas / Arlington, Texas"],
    ],
    palmares: [
      {
        numero: "5",
        titulo: "Super Bowls",
        detalle: "VI · XII · XXVII · XXVIII · XXX",
      },
      {
        numero: "8",
        titulo: "Títulos NFC",
        detalle: "1970 · 1971 · 1975 · 1977 · 1978 · 1992 · 1993 · 1995",
      },
    ],
  },

  NYG: {
    info: [
      ["Fundador", "Tim Mara en 1925"],
      ["Estadio", "MetLife Stadium"],
      ["Ciudad", "New York / East Rutherford, New Jersey"],
    ],
    palmares: [
      {
        numero: "4",
        titulo: "Super Bowls",
        detalle: "XXI · XXV · XLII · XLVI",
      },
      {
        numero: "8",
        titulo: "Campeonatos NFL",
        detalle: "1927 · 1934 · 1938 · 1956 · XXI · XXV · XLII · XLVI",
      },
    ],
  },

  WSH: {
    info: [
      ["Origen", "Franquicia fundada en Boston en 1932"],
      ["Estadio", "Northwest Stadium"],
      ["Ciudad", "Washington, D.C. / Landover, Maryland"],
    ],
    palmares: [
      {
        numero: "3",
        titulo: "Super Bowls",
        detalle: "XVII · XXII · XXVI",
      },
      {
        numero: "5",
        titulo: "Campeonatos NFL",
        detalle: "1937 · 1942 · XVII · XXII · XXVI",
      },
    ],
  },
};

const AFC_SOUTH_HOME: Record<string, FranchiseHomeData> = {
  JAX: {
    info: [
      ["Origen", "Franquicia de expansión concedida en 1993"],
      ["Estadio", "EverBank Field"],
      ["Ciudad", "Jacksonville, Florida"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Sin títulos",
      },
      {
        numero: "5",
        titulo: "Títulos de división",
        detalle: "1998 · 1999 · 2017 · 2022 · 2025",
      },
    ],
  },

  HOU: {
    info: [
      ["Fundador", "Bob McNair en 1999"],
      ["Estadio", "NRG Stadium"],
      ["Ciudad", "Houston, Texas"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Sin apariciones",
      },
      {
        numero: "8",
        titulo: "Títulos AFC Sur",
        detalle: "2011 · 2012 · 2015 · 2016 · 2018 · 2019 · 2023 · 2024",
      },
    ],
  },

  IND: {
    info: [
      ["Origen", "Franquicia establecida en Baltimore en 1953"],
      ["Estadio", "Lucas Oil Stadium"],
      ["Ciudad", "Indianapolis, Indiana"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "V · XLI",
      },
      {
        numero: "4",
        titulo: "Campeonatos de liga",
        detalle: "NFL 1958 · 1959 · 1968 · Super Bowl V/XLI",
      },
    ],
  },

  TEN: {
    info: [
      ["Fundador", "Bud Adams en 1959"],
      ["Estadio", "Nissan Stadium"],
      ["Ciudad", "Nashville, Tennessee"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XXXIV",
      },
      {
        numero: "2",
        titulo: "Títulos AFL",
        detalle: "1960 · 1961",
      },
    ],
  },
};

const AFC_NORTH_HOME: Record<string, FranchiseHomeData> = {
  PIT: {
    info: [
      ["Fundador", "Art Rooney Sr. en 1933"],
      ["Estadio", "Acrisure Stadium"],
      ["Ciudad", "Pittsburgh, Pennsylvania"],
    ],
    palmares: [
      {
        numero: "6",
        titulo: "Super Bowls",
        detalle: "IX · X · XIII · XIV · XL · XLIII",
      },
      {
        numero: "8",
        titulo: "Títulos AFC",
        detalle: "1974 · 1975 · 1978 · 1979 · 1995 · 2005 · 2008 · 2010",
      },
    ],
  },

  BAL: {
    info: [
      ["Origen", "Franquicia establecida en Baltimore en 1996"],
      ["Estadio", "M&T Bank Stadium"],
      ["Ciudad", "Baltimore, Maryland"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "XXXV · XLVII",
      },
      {
        numero: "2",
        titulo: "Títulos AFC",
        detalle: "2000 · 2012",
      },
    ],
  },

  CIN: {
    info: [
      ["Fundador", "Paul Brown en 1967"],
      ["Estadio", "Paycor Stadium"],
      ["Ciudad", "Cincinnati, Ohio"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XVI · XXIII · LVI",
      },
      {
        numero: "3",
        titulo: "Títulos AFC",
        detalle: "1981 · 1988 · 2021",
      },
    ],
  },

  CLE: {
    info: [
      ["Origen", "Franquicia fundada en 1946"],
      ["Estadio", "Huntington Bank Field"],
      ["Ciudad", "Cleveland, Ohio"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Sin apariciones",
      },
      {
        numero: "8",
        titulo: "Campeonatos de liga",
        detalle: "AAFC 1946-49 · NFL 1950 · 1954 · 1955 · 1964",
      },
    ],
  },
};

const AFC_EAST_HOME: Record<string, FranchiseHomeData> = {
  BUF: {
    info: [
      ["Fundador", "Ralph C. Wilson Jr. en 1959"],
      ["Estadio", "Highmark Stadium"],
      ["Ciudad", "Buffalo / Orchard Park, New York"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista XXV · XXVI · XXVII · XXVIII",
      },
      {
        numero: "2",
        titulo: "Títulos AFL",
        detalle: "1964 · 1965",
      },
    ],
  },

  MIA: {
    info: [
      ["Fundador", "Joe Robbie en 1965"],
      ["Estadio", "Hard Rock Stadium"],
      ["Ciudad", "Miami / Miami Gardens, Florida"],
    ],
    palmares: [
      {
        numero: "2",
        titulo: "Super Bowls",
        detalle: "VII · VIII",
      },
      {
        numero: "5",
        titulo: "Títulos AFC",
        detalle: "1971 · 1972 · 1973 · 1982 · 1984",
      },
    ],
  },

  NE: {
    info: [
      ["Fundador", "Billy Sullivan en 1959"],
      ["Estadio", "Gillette Stadium"],
      ["Ciudad", "Foxborough, Massachusetts"],
    ],
    palmares: [
      {
        numero: "6",
        titulo: "Super Bowls",
        detalle: "XXXVI · XXXVIII · XXXIX · XLIX · LI · LIII",
      },
      {
        numero: "11",
        titulo: "Títulos AFC",
        detalle: "1985 · 1996 · 2001 · 2003 · 2004 · 2007 · 2011 · 2014 · 2016 · 2017 · 2018",
      },
    ],
  },

  NYJ: {
    info: [
      ["Origen", "New York Titans, franquicia AFL creada en 1959"],
      ["Estadio", "MetLife Stadium"],
      ["Ciudad", "New York / East Rutherford, New Jersey"],
    ],
    palmares: [
      {
        numero: "1",
        titulo: "Super Bowl",
        detalle: "III",
      },
      {
        numero: "1",
        titulo: "Título AFL",
        detalle: "1968",
      },
    ],
  },
};

const AFC_WEST_HOME: Record<string, FranchiseHomeData> = {
  KC: {
    info: [
      ["Fundador", "Lamar Hunt en 1959"],
      ["Estadio", "GEHA Field at Arrowhead Stadium"],
      ["Ciudad", "Kansas City, Missouri"],
    ],
    palmares: [
      {
        numero: "4",
        titulo: "Super Bowls",
        detalle: "IV · LIV · LVII · LVIII",
      },
      {
        numero: "3",
        titulo: "Títulos AFL",
        detalle: "1962 · 1966 · 1969",
      },
    ],
  },

  DEN: {
    info: [
      ["Fundador", "Bob Howsam en 1959"],
      ["Estadio", "Empower Field at Mile High"],
      ["Ciudad", "Denver, Colorado"],
    ],
    palmares: [
      {
        numero: "3",
        titulo: "Super Bowls",
        detalle: "XXXII · XXXIII · 50",
      },
      {
        numero: "8",
        titulo: "Títulos AFC",
        detalle: "1977 · 1986 · 1987 · 1989 · 1997 · 1998 · 2013 · 2015",
      },
    ],
  },

  LAC: {
    info: [
      ["Fundador", "Barron Hilton en 1959"],
      ["Estadio", "SoFi Stadium"],
      ["Ciudad", "Los Angeles, California"],
    ],
    palmares: [
      {
        numero: "0",
        titulo: "Super Bowls",
        detalle: "Finalista en XXIX",
      },
      {
        numero: "1",
        titulo: "Título AFL",
        detalle: "1963",
      },
    ],
  },

  LV: {
    info: [
      ["Origen", "Franquicia AFL creada en 1960"],
      ["Estadio", "Allegiant Stadium"],
      ["Ciudad", "Las Vegas, Nevada"],
    ],
    palmares: [
      {
        numero: "3",
        titulo: "Super Bowls",
        detalle: "XI · XV · XVIII",
      },
      {
        numero: "1",
        titulo: "Título AFL",
        detalle: "1967",
      },
    ],
  },
};

const FRANCHISE_HOME: Record<string, FranchiseHomeData> = {
  ...NFC_WEST_HOME,
  ...NFC_SOUTH_HOME,
  ...NFC_NORTH_HOME,
  ...NFC_EAST_HOME,
  ...AFC_SOUTH_HOME,
  ...AFC_NORTH_HOME,
  ...AFC_EAST_HOME,
  ...AFC_WEST_HOME,
};

const FRANCHISE_META: Record<
  string,
  { nombre: string; division: string; logo: string }
> = {
  BUF: { nombre: "Buffalo Bills", division: "AFC Este", logo: "buf" },
  MIA: { nombre: "Miami Dolphins", division: "AFC Este", logo: "mia" },
  NE: { nombre: "New England Patriots", division: "AFC Este", logo: "ne" },
  NYJ: { nombre: "New York Jets", division: "AFC Este", logo: "nyj" },
  BAL: { nombre: "Baltimore Ravens", division: "AFC Norte", logo: "bal" },
  CIN: { nombre: "Cincinnati Bengals", division: "AFC Norte", logo: "cin" },
  CLE: { nombre: "Cleveland Browns", division: "AFC Norte", logo: "cle" },
  PIT: { nombre: "Pittsburgh Steelers", division: "AFC Norte", logo: "pit" },
  HOU: { nombre: "Houston Texans", division: "AFC Sur", logo: "hou" },
  IND: { nombre: "Indianapolis Colts", division: "AFC Sur", logo: "ind" },
  JAX: { nombre: "Jacksonville Jaguars", division: "AFC Sur", logo: "jax" },
  TEN: { nombre: "Tennessee Titans", division: "AFC Sur", logo: "ten" },
  DEN: { nombre: "Denver Broncos", division: "AFC Oeste", logo: "den" },
  KC: { nombre: "Kansas City Chiefs", division: "AFC Oeste", logo: "kc" },
  LV: { nombre: "Las Vegas Raiders", division: "AFC Oeste", logo: "lv" },
  LAC: { nombre: "Los Angeles Chargers", division: "AFC Oeste", logo: "lac" },
  DAL: { nombre: "Dallas Cowboys", division: "NFC Este", logo: "dal" },
  NYG: { nombre: "New York Giants", division: "NFC Este", logo: "nyg" },
  PHI: { nombre: "Philadelphia Eagles", division: "NFC Este", logo: "phi" },
  WSH: { nombre: "Washington Commanders", division: "NFC Este", logo: "wsh" },
  CHI: { nombre: "Chicago Bears", division: "NFC Norte", logo: "chi" },
  DET: { nombre: "Detroit Lions", division: "NFC Norte", logo: "det" },
  GB: { nombre: "Green Bay Packers", division: "NFC Norte", logo: "gb" },
  MIN: { nombre: "Minnesota Vikings", division: "NFC Norte", logo: "min" },
  ATL: { nombre: "Atlanta Falcons", division: "NFC Sur", logo: "atl" },
  CAR: { nombre: "Carolina Panthers", division: "NFC Sur", logo: "car" },
  NO: { nombre: "New Orleans Saints", division: "NFC Sur", logo: "no" },
  TB: { nombre: "Tampa Bay Buccaneers", division: "NFC Sur", logo: "tb" },
  ARI: { nombre: "Arizona Cardinals", division: "NFC Oeste", logo: "ari" },
  LAR: { nombre: "Los Angeles Rams", division: "NFC Oeste", logo: "lar" },
  SF: { nombre: "San Francisco 49ers", division: "NFC Oeste", logo: "sf" },
  SEA: { nombre: "Seattle Seahawks", division: "NFC Oeste", logo: "sea" },
};

export default function FranchiseHome({
  teamId, temporada,
  onBack,
  section,
  onSectionChange,
  rosterTab,
  onRosterTabChange,
}: Props) {
  const homeData = FRANCHISE_HOME[teamId] ?? null;
  const franchise = FRANCHISE_META[teamId] ?? {
    nombre: teamId,
    division: "",
    logo: teamId.toLowerCase(),
  };

  const [divisionTeams, setDivisionTeams] = useState<
    DivisionStandingHome[]
  >([]);

  useEffect(() => {
    let cancelado = false;

    async function cargarDivision() {
      // Evitamos conservar datos de otra temporada mientras carga.
      setDivisionTeams([]);

      const esAfc =
        ["BUF", "MIA", "NE", "NYJ",
         "BAL", "CIN", "CLE", "PIT",
         "HOU", "IND", "JAX", "TEN",
         "DEN", "KC", "LV", "LAC"].includes(teamId);

      const conferencia = esAfc ? "AFC" : "NFC";

      const division =
        ["BUF", "MIA", "NE", "NYJ",
         "DAL", "NYG", "PHI", "WSH"].includes(teamId)
          ? "EAST"
          : ["BAL", "CIN", "CLE", "PIT",
             "CHI", "DET", "GB", "MIN"].includes(teamId)
            ? "NORTH"
            : ["HOU", "IND", "JAX", "TEN",
               "ATL", "CAR", "NO", "TB"].includes(teamId)
              ? "SOUTH"
              : "WEST";

      try {
        const response = await fetch(
          `/api/espn-standings?season=${temporada}&seasontype=2`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const datos: EspnStandingHome[] = await response.json();

        const filtrados = datos
          .filter(
            (equipo) =>
              equipo.conferencia === conferencia &&
              String(equipo.division).toUpperCase() === division,
          )
          .map((equipo) => {
            const pf = Number(equipo.PA);
            const pc = Number(equipo.PC);

            const diferencia =
              Number.isFinite(pf) && Number.isFinite(pc)
                ? pf - pc
                : 0;

            return {
              nombre: equipo.nombre,
              abrev: equipo.equipo,
              g: equipo.G || "0",
              p: equipo.P || "0",
              e: equipo.E || "0",
              pct: equipo.PCT || ".000",
              pf: equipo.PA || "0",
              pc: equipo.PC || "0",
              dif:
                diferencia > 0
                  ? `+${diferencia}`
                  : String(diferencia),
            };
          })
          .sort((a, b) => {
            const pctA = Number(a.pct);
            const pctB = Number(b.pct);

            if (pctB !== pctA) {
              return pctB - pctA;
            }

            return Number(b.g) - Number(a.g);
          });

        if (!cancelado) {
          setDivisionTeams(filtrados);
        }
      } catch (error) {
        console.error(
          "Error cargando clasificación divisional ESPN:",
          error,
        );

        if (!cancelado) {
          setDivisionTeams([]);
        }
      }
    }

    cargarDivision();

    return () => {
      cancelado = true;
    };
  }, [teamId, temporada]);

  return (
    <section className="px-3 pt-4 pb-5 md:px-6 md:pt-5 md:pb-7">
      <div className="overflow-hidden rounded-2xl bg-white text-black shadow-2xl">
        <div className="grid grid-cols-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => onSectionChange("home")}
            className={`relative py-4 font-['Orbitron'] text-sm font-black uppercase md:py-5 md:text-base ${section === "home" ? "text-red-700" : "text-zinc-400"}`}
          >
            HOME
            {section === "home" && (
              <span className="absolute bottom-0 left-5 right-5 h-[3px] bg-red-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSectionChange("plantilla")}
            className={`relative py-4 font-['Orbitron'] text-sm font-black uppercase md:py-5 md:text-base ${section === "plantilla" ? "text-red-700" : "text-zinc-400"}`}
          >
            PLANTILLA
            {section === "plantilla" && (
              <span className="absolute bottom-0 left-5 right-5 h-[3px] bg-red-700" />
            )}
          </button>
        </div>

        <div className="p-5 md:p-8">
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 font-['Orbitron'] text-[9px] font-black uppercase text-red-700 hover:text-red-900 md:text-[10px]"
            >
              <span className="md:hidden">← VOLVER</span>
              <span className="hidden md:inline">← VOLVER A FRANQUICIAS</span>
            </button>
          </div>

          <div className="mb-8 flex items-center gap-4 border-b border-zinc-200 pb-6 md:gap-6">
            <img
              src={`https://a.espncdn.com/i/teamlogos/nfl/500/${franchise.logo}.png`}
              alt={franchise.nombre}
              className="h-20 w-20 flex-shrink-0 object-contain md:h-28 md:w-28"
            />
            <div className="min-w-0">
              <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-widest text-zinc-500 md:text-xs">
                {franchise.division}
              </div>
              <h2 className="mt-1 font-['Orbitron'] text-2xl font-black uppercase leading-tight text-[#002244] md:text-4xl">
                {franchise.nombre}
              </h2>
            </div>
          </div>

          {section === "plantilla" ? (
            <FranchiseRoster
              teamId={teamId}
              tab={rosterTab}
              onTabChange={onRosterTabChange}
            />
          ) : !homeData ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              HOME se generalizará división por división.
            </div>
          ) : (
            <>
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="mb-3 border-b-2 border-red-700 pb-2">
                    <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
                      Información general
                    </h3>
                  </div>

                  <dl className="text-xs md:text-sm">
                    {homeData.info.map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[150px_1fr] gap-3 border-b border-zinc-200 py-2 last:border-b-0 md:grid-cols-[180px_1fr]"
                      >
                        <dt className="font-bold text-zinc-800">{label}</dt>
                        <dd className="font-medium text-zinc-900">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 mb-3 border-b-2 border-red-700 pb-2">
                    <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
                      Palmarés
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {homeData.palmares.map((titulo) => (
                      <div
                        key={titulo.titulo}
                        className="rounded-xl bg-zinc-50 p-4"
                      >
                        <div className="flex items-baseline gap-4">
                          <div className="font-['Orbitron'] text-3xl font-black text-red-700">
                            {titulo.numero}
                          </div>
                          <div>
                            <div className="font-bold text-[#002244]">
                              {titulo.titulo}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {titulo.detalle}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-3 border-b-2 border-red-700 pb-2">
                    <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
                      {franchise.division}
                    </h3>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <table className="min-w-[620px] w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#002244] text-white">
                          <th className="px-3 py-3 text-left font-black">
                            EQUIPO
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            G
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            P
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            E
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            PCT
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            PF
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            PC
                          </th>
                          <th className="px-2 py-3 text-center font-black">
                            DIF
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {divisionTeams.map((equipo) => {
                          const seleccionado = equipo.abrev === teamId;
                          return (
                            <tr
                              key={equipo.abrev}
                              className={`border-b border-zinc-200 ${seleccionado ? "bg-red-50 text-red-700" : "bg-white text-zinc-900"}`}
                            >
                              <td className="px-3 py-4">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${equipo.abrev.toLowerCase()}.png`}
                                    alt={equipo.nombre}
                                    className="h-8 w-8 flex-shrink-0 object-contain"
                                  />
                                  <span className="whitespace-nowrap font-bold">
                                    {equipo.nombre}
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.g}
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.p}
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.e}
                              </td>
                              <td className="bg-blue-50 px-2 py-4 text-center font-black">
                                {equipo.pct}
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.pf}
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.pc}
                              </td>
                              <td className="px-2 py-4 text-center font-bold">
                                {equipo.dif}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                    Temporada regular {temporada}
                  </p>
                </div>
              </div>

              <FranchiseTeamStatsSummary teamId={teamId} temporada={temporada} />
              <FranchiseSchedule teamId={teamId} temporada={temporada} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
