import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";
import { getDeviceInfo } from "@zos/device";

const { width, height } = getDeviceInfo();
const side = px(34);
const contentWidth = width - side * 2;

export const BACKGROUND = { x: 0, y: 0, w: width, h: height, color: 0x062238, radius: width / 2 };
export const BRAND = { x: side, y: px(54), w: contentWidth, h: px(36), text: "MASJID BILAL", color: 0xe7c66b, text_size: px(24), align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V };
export const PRAYER = { x: side, y: px(116), w: contentWidth, h: px(62), text: "Prayer", color: 0xffffff, text_size: px(44), align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V, text_style: hmUI.text_style.ELLIPSIS };
export const TIME = { x: side, y: px(176), w: contentWidth, h: px(70), text: "—", color: 0xe7c66b, text_size: px(50), align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V };
export const COUNTDOWN = { x: side, y: px(245), w: contentWidth, h: px(44), text: "", color: 0xffffff, text_size: px(30), align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V };
export const STATUS = { x: side, y: px(300), w: contentWidth, h: px(58), text: "", color: 0xc8e7e8, text_size: px(20), align_h: hmUI.align.CENTER_H, align_v: hmUI.align.CENTER_V, text_style: hmUI.text_style.WRAP };
export const REFRESH = { x: (width - px(210)) / 2, y: height - px(104), w: px(210), h: px(62), text: "Refresh", text_size: px(25), radius: px(31), normal_color: 0x087b83, press_color: 0x1268a8, color: 0xffffff };
