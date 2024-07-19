package com.pdf.ingot;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.itextpdf.kernel.pdf.canvas.parser.listener.LocationTextExtractionStrategy;
import com.itextpdf.signatures.PdfPKCS7;
import com.itextpdf.signatures.SignatureUtil;
import com.pdf.ingot.data.PdfSealData;
import lombok.experimental.UtilityClass;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import java.io.IOException;
import java.io.InputStream;
import java.security.Security;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Pdf解析工具类
 * @author : Coratch
 * @create 2024/7/19 5:00 PM
 */
@UtilityClass
public class PdfParseUtil {

    /**
     * 解析Pdf文本
     * @param inputStream 文件流
     * @return Pdf文本
     * @throws IOException
     */
    public String parsePdfContent(InputStream inputStream) throws IOException {
        // 注册BouncyCastleProvider
        Security.addProvider(new BouncyCastleProvider());
        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(inputStream))){
            StringBuilder sb = new StringBuilder();
            int numberOfPages = pdfDoc.getNumberOfPages();
            for (int page = 1; page <= numberOfPages; page++) {
                // 使用 PdfTextExtractor 提取每一页的文本
                String pageText = PdfTextExtractor.getTextFromPage(pdfDoc.getPage(page), new LocationTextExtractionStrategy());
                sb.append(pageText);
            }
            return sb.toString();
        } catch (IOException e) {
            e.printStackTrace();
        }finally {
            if (inputStream != null){
                inputStream.close();
            }
        }
        return null;
    }


    /**
     * 解析Pdf签名
     * @param inputStream 文件流
     * @return Pdf签名
     */
    public List<PdfSealData> parsePdfSignature(InputStream inputStream){
        // 注册BouncyCastleProvider
        Security.addProvider(new BouncyCastleProvider());
        List<PdfSealData> signData = new ArrayList<>();
        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(inputStream))){
            SignatureUtil signUtil = new SignatureUtil(pdfDoc);
            // 获取所有签名的名称
            List<String> signatureNames = signUtil.getSignatureNames();
            for (String signatureName : signatureNames) {
                // 获取签名相关的信息
                PdfPKCS7 pkcs7 = signUtil.readSignatureData(signatureName);
                X509Certificate cert = pkcs7.getSigningCertificate();
                signData.add(new PdfSealData(pkcs7.getSignDate().getTime(), cert.getSubjectDN().toString(), cert.getSubjectDN().toString()));
            }
            return signData;
        } catch (IOException e) {
            e.printStackTrace();
        }
        return Collections.emptyList();
    }

}
