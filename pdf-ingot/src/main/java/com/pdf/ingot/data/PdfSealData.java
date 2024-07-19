package com.pdf.ingot.data;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

/**
 * Pdf签章数据
 * @author : Coratch
 * @create 2024/7/19 2:00 PM
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PdfSealData {
    /**
     * 签章时间
     */
    private Date sealTime;
    /**
     * 签章姓名
     */
    private String sealName;
    /**
     * 签名
     */
    private String subject;
}
