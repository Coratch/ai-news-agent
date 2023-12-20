package com.coratch.pdf.textreplacer;

import java.io.*;
import java.util.List;

import com.coratch.pdf.textreplacer.exceptions.MissingPDFException;
import com.coratch.pdf.textreplacer.pdfutils.ImageUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.TextPosition;
import org.apache.pdfbox.util.Matrix;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.coratch.pdf.textreplacer.pdfutils.TextPositionFinder;

@SpringBootApplication
@EnableConfigurationProperties(TextReplacerApplicationProperties.class)
public class TextReplacerApplication implements CommandLineRunner {

	@Autowired
	private TextReplacerApplicationProperties properties;

	public static void main(String[] args) {
		try {
			SpringApplication.run(TextReplacerApplication.class, args);
		}catch (Exception ex){
			System.out.println(ex.getMessage());
		}
	}

	@Override
	public void run(String... arg0) throws Exception {
		int replaceCount = Integer.MAX_VALUE;
		for (int i = 0; i < Integer.MAX_VALUE; i++) {
			if (i >= replaceCount){
				break;
			}
			File pdfFile = new File(properties.getPdf());
			if (!pdfFile.exists()) {
				throw new MissingPDFException(properties.getPdf());
			}
			try (PDDocument document = PDDocument.load(pdfFile)) {
				replaceCount = document.getNumberOfPages();
				//待替换文本
				String text = "xxx";
				PDPage page = document.getPage(i);
				TextPositionFinder textPositionFinder = new TextPositionFinder(text);
				textPositionFinder.setSortByPosition(true);
				textPositionFinder.setStartPage(i+1);
				textPositionFinder.setEndPage(i+1);
				textPositionFinder.writeText(document, new StringWriter());
				//判断是否存在待替换文本
				if (!textPositionFinder.textExists()) {
					continue;
				}
				List<TextPosition> textPositions = textPositionFinder.getTextPosition();
				for (TextPosition textPosition : textPositions) {
					try (PDPageContentStream contentStream = new PDPageContentStream(document, page, AppendMode.APPEND,
							true, true)) {
						PDImageXObject pdImage = PDImageXObject.createFromFile(properties.getImage(), document);
						Matrix textMatrix = textPosition.getTextMatrix();
						//坐标，数字*7,文字*12
						contentStream.drawImage(pdImage, textMatrix.getTranslateX() + 12, textMatrix.getTranslateY() - properties.getImageHeight() + (textPosition.getHeight() *2)  , 12, properties.getImageHeight());
					}
				}
				document.save(properties.getPdf());
			}
		}

		FileInputStream inputStream = new FileInputStream(properties.getPdf());
		byte[] bytes = ImageUtil.transfer2Image(inputStream);
		byte[] bytes1 = ImageUtil.imageToPdf(bytes);
		PDDocument.load(bytes1).save(properties.getTargetImagePath());
		inputStream.close();

	}

}
