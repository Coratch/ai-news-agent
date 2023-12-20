package com.coratch.pdf.textreplacer.pdfutils;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfWriter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * @author : Coratch
 * @create 2023/12/19 11:03 PM
 */
public class ImageUtil {

    public static byte[] imageToPdf(byte[] imageB) throws Exception {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        // 设置文档页边距
        document.setMargins(0, 0, 0, 0);
        try {
            PdfWriter.getInstance(document, outputStream);
            // 打开文档
            document.open();

            if(imageB != null){
                try {
                    Image image = getImage(imageB);
                    // 设置页面宽高与图片一致
                    Rectangle rectangle = new Rectangle(image.getScaledWidth(), image.getScaledHeight());
                    document.setPageSize(rectangle);
                    // 新建一页添加图片
                    document.newPage();
                    document.add(image);
                } catch (Exception e) {
                }
            }
        } finally {
            // 关闭文档
            document.close();
            try {
                outputStream.flush();
                outputStream.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return outputStream.toByteArray();
    }
    public static byte[] transfer2Image(InputStream pdfStream) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PDDocument pdf = null;
        try {
            pdf = PDDocument.load(pdfStream);
            int actSize = pdf.getNumberOfPages();
            List<BufferedImage> picList = new ArrayList<>();
            for (int i = 0; i < actSize; i++) {
                BufferedImage image = new PDFRenderer(pdf).renderImageWithDPI(i, 130, ImageType.RGB);
                picList.add(image);
            }
            mergePic(picList, outputStream);
        } catch (IOException e) {

        } finally {
            if (null != pdfStream) {
                try {
                    pdfStream.close();
                } catch (Exception e) {
                }
            }
            if(pdf != null) {
                try {
                    pdf.close();
                } catch (Exception e) {
                }
            }
        }

        return outputStream.toByteArray();
    }

    public static void mergePic(List<BufferedImage> picList, OutputStream outputStream){
        if (picList == null || picList.size() <= 0) {
            return;
        }
        try {
            int height = 0;
            int width = 0;
            int height2 = 0;
            int height3 = 0;
            int picNum = picList.size();
            int[] heightArray = new int[picNum];
            BufferedImage buffer = null;
            List<int[]> imgRGB = new ArrayList<int[]>();
            int[] imgRGBInt;
            for (int i = 0; i < picNum; i++) {
                buffer = picList.get(i);
                heightArray[i] = height2 = buffer.getHeight();
                if (i == 0) {
                    width = buffer.getWidth();
                }
                height += height2;
                imgRGBInt = new int[width * height2];
                imgRGBInt = buffer.getRGB(0, 0, width, height2, imgRGBInt, 0, width);
                imgRGB.add(imgRGBInt);
            }
            height2 = 0;
            BufferedImage imageResult = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            for (int i = 0; i < picNum; i++) {
                height3 = heightArray[i];
                if (i != 0) {
                    height2 += height3;
                }
                imageResult.setRGB(0, height2, width, height3, imgRGB.get(i), 0, width);
            }
            ImageIO.write(imageResult, "jpg", outputStream);
        } catch (Exception e) {
        }
    }
    private static Image getImage(byte[] imgb) throws BadElementException, IOException {
        // 获取图片的宽高
        Image image = Image.getInstance(imgb);
        image.scalePercent(500);
        // 调整图片缩放
        image.scaleToFit(1000,1000);
        // 图片居中
        image.setAlignment(Image.ALIGN_CENTER);
        return image;
    }
}
